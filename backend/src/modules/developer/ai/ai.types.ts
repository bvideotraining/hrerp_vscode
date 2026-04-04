/**
 * Developer AI Assistant — shared types
 */

export interface AiConversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolCallId?: string;
  createdAt: Date;
}

// ── Tool I/O shapes ────────────────────────────────────────────

export interface ToolCallResult {
  toolName: string;
  result: unknown;
  error?: string;
}

export interface FileDiff {
  path: string;
  before: string;
  after: string;
}
