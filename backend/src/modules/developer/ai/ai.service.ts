import { Injectable } from '@nestjs/common';
import { FirebaseService } from '@config/firebase/firebase.service';
import {
  GoogleGenerativeAI,
  FunctionDeclarationsTool,
  SchemaType,
  Content,
  Part,
  FunctionResponsePart,
} from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { AiConversation, AiMessage } from './ai.types';

@Injectable()
export class AiService {
  private readonly CONV_COLLECTION = 'ai_conversations';
  private readonly MSG_COLLECTION = 'ai_messages';

  // Root of the entire project (two levels up from backend/src/modules/developer/ai/)
  private readonly PROJECT_ROOT = path.resolve(__dirname, '../../../../..');

  constructor(private firebaseService: FirebaseService) {}

  // ── Conversation CRUD ─────────────────────────────────────────

  async createConversation(firstMessage: string): Promise<AiConversation> {
    const db = this.firebaseService.getFirestore();
    const id = uuidv4();
    const now = new Date();
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? '…' : '');
    const conv: AiConversation = { id, title, createdAt: now, updatedAt: now };
    await db.collection(this.CONV_COLLECTION).doc(id).set(conv);
    return conv;
  }

  async listConversations(): Promise<AiConversation[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection(this.CONV_COLLECTION)
      .orderBy('updatedAt', 'desc')
      .limit(30)
      .get();
    return snap.docs.map((d) => d.data() as AiConversation);
  }

  async getMessages(conversationId: string): Promise<AiMessage[]> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection(this.MSG_COLLECTION)
      .where('conversationId', '==', conversationId)
      .orderBy('createdAt', 'asc')
      .get();
    return snap.docs.map((d) => d.data() as AiMessage);
  }

  async clearConversation(conversationId: string): Promise<void> {
    const db = this.firebaseService.getFirestore();
    const snap = await db
      .collection(this.MSG_COLLECTION)
      .where('conversationId', '==', conversationId)
      .get();
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await db.collection(this.CONV_COLLECTION).doc(conversationId).update({ updatedAt: new Date() });
  }

  async saveMessage(msg: Omit<AiMessage, 'id' | 'createdAt'>): Promise<AiMessage> {
    const db = this.firebaseService.getFirestore();
    const id = uuidv4();
    const full: AiMessage = { ...msg, id, createdAt: new Date() };
    await db.collection(this.MSG_COLLECTION).doc(id).set(full);
    return full;
  }

  // ── Main streaming entry point ────────────────────────────────

  /**
   * Streams SSE events to the response.
   * Caller is responsible for setting Content-Type: text/event-stream.
   */
  async streamChat(
    conversationId: string,
    userText: string,
    send: (event: string, data: string) => void,
  ): Promise<void> {
    // Persist user message
    await this.saveMessage({ conversationId, role: 'user', content: userText });
    await this.firebaseService.getFirestore()
      .collection(this.CONV_COLLECTION)
      .doc(conversationId)
      .update({ updatedAt: new Date() });

    // Load history for context
    const history = await this.getMessages(conversationId);

    // Build Gemini contents array (skip the message we just saved — included below)
    const contents: Content[] = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1) // last user message added separately below
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const apiKey = process.env.GEMINI_API_KEY || '';
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.buildSystemPrompt(),
      tools: [this.buildTools()],
    });

    const chat = model.startChat({ history: contents });

    let iterationCount = 0;
    const maxIterations = 10;
    let pendingText = userText;

    send('status', JSON.stringify({ status: 'thinking' }));

    while (iterationCount < maxIterations) {
      iterationCount++;

      // Send message (stream response)
      const result = await chat.sendMessageStream(pendingText);
      pendingText = ''; // subsequent iterations pass tool results via history

      let fullText = '';
      const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          send('delta', JSON.stringify({ text: chunkText }));
        }

        // Collect function calls
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.functionCall) {
              functionCalls.push({
                name: part.functionCall.name,
                args: (part.functionCall.args as Record<string, unknown>) || {},
              });
            }
          }
        }
      }

      // If no tool calls — final text response
      if (functionCalls.length === 0) {
        if (fullText) {
          await this.saveMessage({
            conversationId,
            role: 'assistant',
            content: fullText,
          });
          send('done', JSON.stringify({ text: fullText }));
        }
        break;
      }

      // Execute tool calls and feed results back
      send('status', JSON.stringify({ status: 'executing', tools: functionCalls.map((fc) => fc.name) }));

      const toolResponseParts: Part[] = [];

      for (const fc of functionCalls) {
        let toolResult: unknown;
        let toolError: string | undefined;

        try {
          toolResult = await this.executeTool(fc.name, fc.args, send, conversationId);
        } catch (err) {
          toolError = err instanceof Error ? err.message : String(err);
          toolResult = { error: toolError };
        }

        const response = toolError
          ? { error: toolError }
          : toolResult;

        toolResponseParts.push({
          functionResponse: {
            name: fc.name,
            response: { result: response },
          },
        } as FunctionResponsePart);

        // Save tool call to history
        await this.saveMessage({
          conversationId,
          role: 'tool',
          content: JSON.stringify(response),
          toolName: fc.name,
        });
      }

      // Feed tool results back to model
      await chat.sendMessage(toolResponseParts);
      send('status', JSON.stringify({ status: 'thinking' }));

      // Ask model to continue after tools
      pendingText = 'Please continue with the results of the tool calls above.';
    }

    send('end', '{}');
  }

  // ── Tool executor ─────────────────────────────────────────────

  private async executeTool(
    name: string,
    args: Record<string, unknown>,
    send: (event: string, data: string) => void,
    conversationId: string,
  ): Promise<unknown> {
    const db = this.firebaseService.getFirestore();

    switch (name) {
      // ── Attendance rules ──────────────────────────────────────

      case 'list_attendance_rules': {
        const snap = await db.collection('attendanceRules').get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      case 'create_attendance_rule': {
        const ref = db.collection('attendanceRules').doc();
        const data = { ...args, createdAt: new Date(), updatedAt: new Date() };
        await ref.set(data);
        return { id: ref.id, ...data };
      }

      case 'update_attendance_rule': {
        const { id, ...fields } = args as { id: string; [k: string]: unknown };
        await db.collection('attendanceRules').doc(id).update({ ...fields, updatedAt: new Date() });
        return { updated: true, id };
      }

      // ── Month ranges ──────────────────────────────────────────

      case 'list_month_ranges': {
        const snap = await db.collection('monthRanges').get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      case 'create_month_range': {
        const ref = db.collection('monthRanges').doc();
        const data = { ...args, createdAt: new Date(), updatedAt: new Date() };
        await ref.set(data);
        return { id: ref.id, ...data };
      }

      case 'update_month_range': {
        const { id, ...fields } = args as { id: string; [k: string]: unknown };
        await db.collection('monthRanges').doc(id).update({ ...fields, updatedAt: new Date() });
        return { updated: true, id };
      }

      case 'delete_month_range': {
        const { id } = args as { id: string };
        await db.collection('monthRanges').doc(id).delete();
        return { deleted: true, id };
      }

      // ── System config ─────────────────────────────────────────

      case 'get_system_config': {
        const doc = await db.collection('systemConfig').doc('default').get();
        return doc.exists ? doc.data() : {};
      }

      case 'update_system_config': {
        await db.collection('systemConfig').doc('default').set(
          { ...args, updatedAt: new Date() },
          { merge: true },
        );
        return { updated: true };
      }

      // ── File system tools ─────────────────────────────────────

      case 'read_file': {
        const { file_path } = args as { file_path: string };
        const safePath = this.resolveSafePath(file_path);
        if (!fs.existsSync(safePath)) return { error: `File not found: ${file_path}` };
        const content = fs.readFileSync(safePath, 'utf-8');
        return { path: file_path, content, lines: content.split('\n').length };
      }

      case 'write_file': {
        const { file_path, content } = args as { file_path: string; content: string };
        const safePath = this.resolveSafePath(file_path);
        const before = fs.existsSync(safePath) ? fs.readFileSync(safePath, 'utf-8') : '';
        fs.mkdirSync(path.dirname(safePath), { recursive: true });
        fs.writeFileSync(safePath, content, 'utf-8');

        // Stream diff event to client
        send('diff', JSON.stringify({ path: file_path, before, after: content }));

        // Immediately run type-check and report
        const checkResult = await this.executeTool('run_typecheck', {}, send, conversationId);
        return { written: true, path: file_path, typecheck: checkResult };
      }

      case 'list_files': {
        const { dir_path } = args as { dir_path: string };
        const safePath = this.resolveSafePath(dir_path);
        if (!fs.existsSync(safePath)) return { error: `Directory not found: ${dir_path}` };
        const entries = fs.readdirSync(safePath).map((name) => {
          const full = path.join(safePath, name);
          const stat = fs.statSync(full);
          return { name, type: stat.isDirectory() ? 'dir' : 'file', size: stat.size };
        });
        return { path: dir_path, entries };
      }

      // ── Dev tools ─────────────────────────────────────────────

      case 'run_typecheck': {
        try {
          const backendDir = path.join(this.PROJECT_ROOT, 'backend');
          execSync('npx tsc --noEmit', { cwd: backendDir, stdio: 'pipe', timeout: 30000 });
          return { errors: 0, clean: true };
        } catch (err: unknown) {
          const output = (err as { stdout?: Buffer; stderr?: Buffer }).stdout?.toString() || '';
          const lines = output.split('\n').filter(Boolean);
          return { errors: lines.length, clean: false, output: lines.slice(0, 30) };
        }
      }

      case 'restart_server': {
        send('status', JSON.stringify({ status: 'restarting' }));
        // Delay to let SSE response flush
        setTimeout(() => process.exit(0), 500);
        return { restarting: true };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  /** Resolve a relative-or-absolute path safely within PROJECT_ROOT */
  private resolveSafePath(filePath: string): string {
    // Strip leading slash or ./
    const normalized = filePath.replace(/^\.?\//, '');
    const resolved = path.resolve(this.PROJECT_ROOT, normalized);
    // Security: must be inside project root
    if (!resolved.startsWith(this.PROJECT_ROOT)) {
      throw new Error(`Path traversal blocked: ${filePath}`);
    }
    return resolved;
  }

  // ── System prompt ─────────────────────────────────────────────

  private buildSystemPrompt(): string {
    return `You are the Vibe Configuration Assistant for an HR ERP system.
You have full access to the system's Firestore database and source code.

PROJECT STRUCTURE:
- backend/  — NestJS API server (TypeScript). Collections: attendanceRules, monthRanges, systemConfig, employees, branches, departments, payroll, etc.
- frontend/ — Next.js 14 app (TypeScript, Tailwind CSS).

YOUR CAPABILITIES:
1. Read and modify Firestore data (attendance rules, month ranges, system config).
2. Read any source file and write optimized versions back to disk.
3. After any write_file call you MUST call run_typecheck and iterate until errors = 0.
4. Restart the server when backend credentials or config changes require it.

CRITICAL WORKFLOW FOR DATA OPERATIONS:
When a user asks about attendance rules, month ranges, or system configuration:
1. FIRST: Call list_attendance_rules, list_month_ranges, and/or get_system_config to see the current state.
2. THEN: Present what currently exists in a clear, readable format before suggesting any changes.
3. THEN: Check for conflicts or duplicates before creating or updating any record.
4. FINALLY: Apply the requested change and confirm what was changed with the new values.

This workflow is mandatory — never create or update data without first retrieving and presenting the current state.

OPTIMIZATION MANDATE:
After completing a data or config change, scan related source files for:
- Dead code / unused imports
- Hard-coded values that should use config
- Repeated logic that can be extracted
Apply improvements and report the diff.

ERROR-FIX MANDATE:
If write_file produces TypeScript errors, call write_file again with the corrected content.
Repeat until run_typecheck returns { clean: true }. Report what was fixed.

RESPONSE FORMAT:
- Be conversational and concise.
- When you modify data, confirm what changed and the new values.
- When you modify a file, briefly explain what you improved.
- Use plain text. The frontend will render file diffs from structured diff events automatically.
- Never expose raw private keys, passwords, or the full .env contents.`;
  }

  // ── Tool declarations ─────────────────────────────────────────

  private buildTools(): FunctionDeclarationsTool {
    return {
      functionDeclarations: [
        // Attendance rules
        {
          name: 'list_attendance_rules',
          description: 'List all attendance rules / categories from Firestore.',
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
          name: 'create_attendance_rule',
          description: 'Create a new attendance rule / category.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              category: { type: SchemaType.STRING, description: 'Category name, e.g. WhiteCollar' },
              workStart: { type: SchemaType.STRING, description: 'HH:MM work start time' },
              workEnd: { type: SchemaType.STRING, description: 'HH:MM work end time' },
              isFlexible: { type: SchemaType.BOOLEAN, description: 'Whether schedule is flexible' },
            },
            required: ['category'],
          },
        },
        {
          name: 'update_attendance_rule',
          description: 'Update fields of an existing attendance rule by Firestore document ID.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING, description: 'Firestore document ID' },
            },
            required: ['id'],
          },
        },

        // Month ranges
        {
          name: 'list_month_ranges',
          description: 'List all month range definitions.',
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
          name: 'create_month_range',
          description: 'Create a new month range.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              monthName: { type: SchemaType.STRING },
              startDate: { type: SchemaType.STRING, description: 'Day of month, e.g. "26"' },
              endDate: { type: SchemaType.STRING, description: 'Day of month, e.g. "25"' },
            },
            required: ['monthName', 'startDate', 'endDate'],
          },
        },
        {
          name: 'update_month_range',
          description: 'Update an existing month range by ID.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              id: { type: SchemaType.STRING },
            },
            required: ['id'],
          },
        },
        {
          name: 'delete_month_range',
          description: 'Delete a month range by ID.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: { id: { type: SchemaType.STRING } },
            required: ['id'],
          },
        },

        // System config
        {
          name: 'get_system_config',
          description: 'Get the current system configuration (company name, currency, working days, etc.).',
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
          name: 'update_system_config',
          description: 'Update system config fields (merged, not replaced).',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              defaultCurrency: { type: SchemaType.STRING },
              workingDaysPerWeek: { type: SchemaType.NUMBER },
              weeklyHolidays: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            },
          },
        },

        // File system tools
        {
          name: 'read_file',
          description: 'Read the contents of any source file in the project. Path is relative to project root.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              file_path: { type: SchemaType.STRING, description: 'Relative path from project root, e.g. backend/src/modules/settings/settings.service.ts' },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'write_file',
          description: 'Write content to a source file. ALWAYS call run_typecheck after writing TypeScript files. The system will auto-run typecheck after write.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              file_path: { type: SchemaType.STRING, description: 'Relative path from project root' },
              content: { type: SchemaType.STRING, description: 'Full new content of the file' },
            },
            required: ['file_path', 'content'],
          },
        },
        {
          name: 'list_files',
          description: 'List files and directories in a given directory.',
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              dir_path: { type: SchemaType.STRING, description: 'Relative directory path from project root' },
            },
            required: ['dir_path'],
          },
        },

        // Dev tools
        {
          name: 'run_typecheck',
          description: 'Run TypeScript type checking on the backend (tsc --noEmit). Returns errors array. Always call after writing TypeScript files.',
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
        {
          name: 'restart_server',
          description: 'Gracefully restart the backend server to apply config/credential changes.',
          parameters: { type: SchemaType.OBJECT, properties: {} },
        },
      ],
    };
  }
}
