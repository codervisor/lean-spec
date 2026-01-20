import type { UIMessage } from '@ai-sdk/react';

// Helper to extract text content from UIMessage parts
function extractTextFromMessage(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => 
      typeof p === 'object' && 
      p !== null && 
      'type' in p && 
      (p as { type: unknown }).type === 'text' && 
      'text' in p
    )
    .map(p => p.text)
    .join('');
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  model: { providerId: string; modelId: string };
  messageCount: number;
  preview: string;
}

export interface ChatStorageInfo {
  path: string;
  sizeBytes: number;
}

interface ChatSessionDto {
  id: string;
  projectId: string;
  title: string;
  providerId?: string | null;
  modelId?: string | null;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview?: string | null;
}

interface ChatMessageDto {
  id: string;
  sessionId: string;
  projectId: string;
  role: UIMessage['role'];
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown> | null;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

function toThread(session: ChatSessionDto): ChatThread {
  return {
    id: session.id,
    title: session.title,
    createdAt: new Date(session.createdAt).toISOString(),
    updatedAt: new Date(session.updatedAt).toISOString(),
    model: {
      providerId: session.providerId ?? 'openai',
      modelId: session.modelId ?? 'gpt-4o',
    },
    messageCount: session.messageCount ?? 0,
    preview: session.preview ?? '',
  };
}

function toUIMessage(message: ChatMessageDto): UIMessage {
  return {
    id: message.id,
    role: message.role,
    parts: [{ type: 'text', text: message.content }],
  } as UIMessage;
}

function toMessageInput(messages: UIMessage[]) {
  return messages.map((message) => ({
    id: message.id,
    role: message.role,
    content: extractTextFromMessage(message),
  }));
}

// Mock API Client to be replaced by real backend calls (Spec 223)
export class ChatApi {
  static async getStorageInfo(): Promise<ChatStorageInfo> {
    const res = await fetch(`${API_BASE}/api/chat/storage`);
    if (!res.ok) {
      throw new Error('Failed to load chat storage info');
    }
    return res.json();
  }

  static async getThreads(projectId?: string): Promise<ChatThread[]> {
    if (!projectId) return [];

    const res = await fetch(`${API_BASE}/api/chat/sessions?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok) {
      throw new Error('Failed to load chat sessions');
    }

    const sessions: ChatSessionDto[] = await res.json();
    return sessions.map(toThread);
  }

  static async createThread(
    projectId: string,
    model: { providerId: string; modelId: string },
    initialMessages: UIMessage[] = [],
  ): Promise<ChatThread> {
    const res = await fetch(`${API_BASE}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        providerId: model.providerId,
        modelId: model.modelId,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to create chat session');
    }

    const session: ChatSessionDto = await res.json();
    const thread = toThread(session);

    if (initialMessages.length > 0) {
      await this.saveMessages(thread.id, initialMessages);
    }

    return thread;
  }

  static async updateThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread> {
    const res = await fetch(`${API_BASE}/api/chat/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: updates.title,
        providerId: updates.model?.providerId,
        modelId: updates.model?.modelId,
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to update chat session');
    }

    const session: ChatSessionDto = await res.json();
    return toThread(session);
  }

  static async deleteThread(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/chat/sessions/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      throw new Error('Failed to delete chat session');
    }
  }

  static async getMessages(threadId: string): Promise<UIMessage[]> {
    const res = await fetch(`${API_BASE}/api/chat/sessions/${threadId}`);
    if (!res.ok) {
      throw new Error('Failed to load chat history');
    }
    const data = await res.json();
    const messages: ChatMessageDto[] = data?.messages ?? [];
    return messages.map(toUIMessage);
  }

  static async saveMessages(
    threadId: string,
    messages: UIMessage[],
    options?: { providerId?: string; modelId?: string },
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/api/chat/sessions/${threadId}/messages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: options?.providerId,
        modelId: options?.modelId,
        messages: toMessageInput(messages),
      }),
    });

    if (!res.ok) {
      throw new Error('Failed to save chat messages');
    }
  }
}
