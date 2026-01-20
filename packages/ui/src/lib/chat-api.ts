import type { UIMessage } from '@ai-sdk/react';

// Simple UUID generator fallback
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

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

const STORAGE_KEY_THREADS = 'leanspec-chat-threads';
const STORAGE_KEY_MESSAGES_PREFIX = 'leanspec-chat-messages-';

// Mock API Client to be replaced by real backend calls (Spec 223)
export class ChatApi {
  static async getThreads(): Promise<ChatThread[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THREADS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse chat threads', e);
    }
    return [];
  }

  static async createThread(model: { providerId: string; modelId: string }, initialMessages: UIMessage[] = []): Promise<ChatThread> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const threads = await this.getThreads();
    const newThread: ChatThread = {
      id: generateId(),
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model,
      messageCount: initialMessages.length,
      preview: initialMessages.length > 0 ? extractTextFromMessage(initialMessages[0]) : '',
    };
    
    threads.unshift(newThread);
    localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
    
    if (initialMessages.length > 0) {
        localStorage.setItem(`${STORAGE_KEY_MESSAGES_PREFIX}${newThread.id}`, JSON.stringify(initialMessages));
    }
    
    return newThread;
  }

  static async updateThread(id: string, updates: Partial<ChatThread>): Promise<ChatThread> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const threads = await this.getThreads();
    const index = threads.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Thread not found');
    
    const updated = { ...threads[index], ...updates, updatedAt: new Date().toISOString() };
    threads[index] = updated;
    localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
    return updated;
  }

  static async deleteThread(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const threads = await this.getThreads();
    const filtered = threads.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(filtered));
    localStorage.removeItem(`${STORAGE_KEY_MESSAGES_PREFIX}${id}`);
  }

  static async getMessages(threadId: string): Promise<UIMessage[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_MESSAGES_PREFIX}${threadId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
       // ignore
    }
    return [];
  }

  static async saveMessages(threadId: string, messages: UIMessage[]): Promise<void> {
    // This is sync in localStorage but backend would be async
    // Also we need to update the thread preview and count
    localStorage.setItem(`${STORAGE_KEY_MESSAGES_PREFIX}${threadId}`, JSON.stringify(messages));
    
    const threads = await this.getThreads();
    const index = threads.findIndex(t => t.id === threadId);
    if (index !== -1) {
      const thread = threads[index];
      // Update preview if it's the first message or if we want to show last? 
      // Spec says: preview: string; // First user message
      const firstUserMsg = messages.find(m => m.role === 'user');

      thread.messageCount = messages.length;
      thread.updatedAt = new Date().toISOString();
      if (firstUserMsg && !thread.preview) {
         thread.preview = extractTextFromMessage(firstUserMsg).slice(0, 100);
      }
      
      localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(threads));
    }
  }
}
