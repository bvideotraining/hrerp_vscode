'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Trash2, Loader2, Bot, User, ChevronDown,
  AlertCircle, Code, Plus,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  createdAt: string;
}

interface FileDiff {
  path: string;
  before: string;
  after: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
  diffs?: FileDiff[];
  toolsUsed?: string[];
}

// ── Diff renderer ─────────────────────────────────────────────

function DiffBlock({ diff }: { diff: FileDiff }) {
  const [expanded, setExpanded] = useState(true);
  const beforeLines = diff.before.split('\n');
  const afterLines = diff.after.split('\n');

  // Simple line diff: highlight added/removed
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const diffLines: Array<{ type: 'added' | 'removed' | 'same'; text: string }> = [];

  for (let i = 0; i < maxLines; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) {
      diffLines.push({ type: 'same', text: a ?? '' });
    } else {
      if (b !== undefined) diffLines.push({ type: 'removed', text: b });
      if (a !== undefined) diffLines.push({ type: 'added', text: a });
    }
  }

  const addedCount = diffLines.filter((l) => l.type === 'added').length;
  const removedCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden text-xs font-mono">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-100">{diff.path}</span>
          <span className="text-green-400">+{addedCount}</span>
          <span className="text-red-400">-{removedCount}</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>

      {/* Diff lines */}
      {expanded && (
        <div className="max-h-64 overflow-y-auto">
          {diffLines.map((line, i) => (
            <div
              key={i}
              className={`px-3 py-0.5 whitespace-pre-wrap break-all ${
                line.type === 'added'
                  ? 'bg-green-950 text-green-300'
                  : line.type === 'removed'
                  ? 'bg-red-950 text-red-300'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              <span className="select-none mr-2 text-slate-600">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </span>
              {line.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────

function StatusPill({ tools }: { tools?: string[] }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-500 px-3 py-1.5">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
      {tools && tools.length > 0
        ? <span>Running: <code className="text-blue-600">{tools.join(', ')}</code></span>
        : <span>Thinking…</span>
      }
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-slate-800'
      }`}>
        {isUser
          ? <User className="h-4 w-4 text-white" />
          : <Bot className="h-4 w-4 text-white" />
        }
      </div>

      {/* Content */}
      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Tools badge */}
        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {msg.toolsUsed.map((tool) => (
              <span key={tool} className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 font-mono">
                {tool}
              </span>
            ))}
          </div>
        )}

        {/* Bubble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
        }`}>
          {msg.text}
          {msg.streaming && (
            <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse align-middle" />
          )}
        </div>

        {/* Diffs */}
        {msg.diffs && msg.diffs.map((diff, i) => (
          <DiffBlock key={i} diff={diff} />
        ))}
      </div>
    </div>
  );
}

// ── Main AI Tab ───────────────────────────────────────────────

export function AiTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [statusText, setStatusText] = useState<{ tools?: string[] } | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load conversations on mount ──────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/developer/ai/conversations`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        // Auto-select most recent
        if (data.length > 0 && !activeConvId) {
          setActiveConvId(data[0].id);
        }
      }
    } catch { /* ignore */ }
  }, [activeConvId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ── Load messages when conversation changes ──────────────────

  useEffect(() => {
    if (!activeConvId) return;
    fetchMessages(activeConvId);
  }, [activeConvId]);

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/developer/ai/conversations/${convId}/messages`);
      if (res.ok) {
        const raw: StoredMessage[] = await res.json();
        // Map to ChatMessage, merge tool messages as metadata on preceding assistant
        const chat: ChatMessage[] = [];
        for (const m of raw) {
          if (m.role === 'user') {
            chat.push({ id: m.id, role: 'user', text: m.content });
          } else if (m.role === 'assistant') {
            chat.push({ id: m.id, role: 'assistant', text: m.content });
          }
          // tool messages are shown via toolsUsed badges — skip raw display
        }
        setMessages(chat);
      }
    } catch { /* ignore */ }
  };

  // ── Scroll to bottom whenever messages change ────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusText]);

  // ── Send message ─────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    setError('');
    setIsStreaming(true);
    setStatusText(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let convId = activeConvId;

    // Create conversation if none active
    if (!convId) {
      try {
        const res = await fetch(`${API_URL}/api/developer/ai/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firstMessage: text }),
        });
        const conv: Conversation = await res.json();
        convId = conv.id;
        setActiveConvId(conv.id);
        setConversations((prev) => [conv, ...prev]);
      } catch {
        setError('Failed to start conversation');
        setIsStreaming(false);
        return;
      }
    }

    // Optimistically add user message
    const userMsgId = `tmp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text }]);

    // Add placeholder AI message
    const aiMsgId = `ai-${Date.now()}`;
    setMessages((prev) => [...prev, { id: aiMsgId, role: 'assistant', text: '', streaming: true, diffs: [], toolsUsed: [] }]);

    // Start SSE stream
    abortRef.current = new AbortController();
    const diffs: FileDiff[] = [];
    const toolsUsed: string[] = [];

    try {
      const res = await fetch(
        `${API_URL}/api/developer/ai/conversations/${convId}/messages/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
          signal: abortRef.current.signal,
        },
      );

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6);
            try {
              const payload = JSON.parse(raw);

              if (currentEvent === 'delta') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, text: m.text + (payload.text ?? '') } : m,
                  ),
                );
              } else if (currentEvent === 'status') {
                setStatusText(payload.tools ? { tools: payload.tools } : null);
                if (payload.tools) {
                  for (const t of payload.tools) {
                    if (!toolsUsed.includes(t)) toolsUsed.push(t);
                  }
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === aiMsgId ? { ...m, toolsUsed: [...toolsUsed] } : m,
                    ),
                  );
                }
              } else if (currentEvent === 'diff') {
                diffs.push(payload as FileDiff);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, diffs: [...diffs] } : m,
                  ),
                );
              } else if (currentEvent === 'done' || currentEvent === 'end') {
                setStatusText(null);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMsgId ? { ...m, streaming: false } : m,
                  ),
                );
              } else if (currentEvent === 'error') {
                setError(payload.message ?? 'AI error');
                setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
              }
            } catch { /* parse error — ignore */ }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Stream failed');
        setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));
      }
    } finally {
      setIsStreaming(false);
      setStatusText(null);
    }
  }, [input, isStreaming, activeConvId]);

  // ── Clear chat ───────────────────────────────────────────────

  const handleClear = async () => {
    if (!activeConvId) return;
    if (!confirm('Clear this conversation history?')) return;
    await fetch(`${API_URL}/api/developer/ai/conversations/${activeConvId}`, { method: 'DELETE' });
    setMessages([]);
  };

  // ── New conversation ─────────────────────────────────────────

  const handleNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setInput('');
  };

  // ── Keyboard shortcut ────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="flex gap-4 h-[680px]">
      {/* Sidebar: Conversation list */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2">
        <button
          onClick={handleNewConversation}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors line-clamp-2 ${
                conv.id === activeConvId
                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              {conv.title}
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-slate-400 px-2 py-4 text-center">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 border border-slate-200 rounded-xl overflow-hidden bg-white">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-slate-700" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Vibe Configuration Assistant</p>
              <p className="text-xs text-slate-500">Tell me what you want to change — I&apos;ll handle the rest</p>
            </div>
          </div>
          <button
            onClick={handleClear}
            disabled={!activeConvId || messages.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 rounded-lg transition-colors border border-slate-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Bot className="h-7 w-7 text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Vibe Configuration Assistant</p>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  I can configure attendance rules, month ranges, system settings, and edit source files.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  'Show all attendance categories',
                  'Change the company currency to USD',
                  'Add a new month range for Q1: Jan 26 – Feb 25',
                  'Read the payroll service file',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    className="text-sm text-left px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {statusText !== null && <StatusPill tools={statusText.tools} />}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              placeholder="Tell me what to configure… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 resize-none px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 min-h-[42px] max-h-[160px] overflow-y-auto"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl transition-colors"
            >
              {isStreaming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">
            AI can read/write source files, modify Firestore data, and restart the server.
          </p>
        </div>
      </div>
    </div>
  );
}
