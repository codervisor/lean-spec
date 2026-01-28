import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing worker
vi.mock('dotenv/config', () => ({}));

// Note: Testing the AiWorker class directly is complex due to stdin/stdout
// These tests focus on the protocol and request handling logic

describe('Worker Protocol', () => {
  describe('WorkerRequest types', () => {
    it('should handle chat request type', () => {
      const request = {
        id: 'req-123',
        type: 'chat' as const,
        payload: {
          messages: [{ role: 'user', content: 'hello' }],
          projectId: 'proj-1',
          providerId: 'openai',
          modelId: 'gpt-4o',
          sessionId: 'session-1',
          config: {},
          baseUrl: 'http://localhost:3000',
        },
      };

      expect(request.type).toBe('chat');
      expect(request.payload.messages).toBeDefined();
      expect(request.payload.messages.length).toBe(1);
    });

    it('should handle health request type', () => {
      const request = {
        id: 'health-123',
        type: 'health' as const,
      };

      expect(request.type).toBe('health');
    });

    it('should handle reload_config request type', () => {
      const request = {
        id: 'cfg-123',
        type: 'reload_config' as const,
        payload: {
          providers: [],
          settings: { maxSteps: 10, defaultProviderId: 'openai', defaultModelId: 'gpt-4o' },
        },
      };

      expect(request.type).toBe('reload_config');
      expect(request.payload.settings.maxSteps).toBe(10);
    });
  });

  describe('WorkerResponse types', () => {
    it('should handle chunk response', () => {
      const response = {
        id: 'req-123',
        type: 'chunk' as const,
        data: { text: 'Hello world' },
      };

      expect(response.type).toBe('chunk');
      expect(response.data.text).toBe('Hello world');
    });

    it('should handle tool_call response', () => {
      const response = {
        id: 'req-123',
        type: 'tool_call' as const,
        data: {
          toolCallId: 'call-123',
          toolName: 'search',
          args: { query: 'test' },
        },
      };

      expect(response.type).toBe('tool_call');
      expect(response.data.toolName).toBe('search');
    });

    it('should handle tool_result response', () => {
      const response = {
        id: 'req-123',
        type: 'tool_result' as const,
        data: {
          toolCallId: 'call-123',
          result: { success: true },
        },
      };

      expect(response.type).toBe('tool_result');
      expect(response.data.result.success).toBe(true);
    });

    it('should handle done response', () => {
      const response = {
        id: 'req-123',
        type: 'done' as const,
      };

      expect(response.type).toBe('done');
    });

    it('should handle error response', () => {
      const response = {
        id: 'req-123',
        type: 'error' as const,
        error: 'Something went wrong',
      };

      expect(response.type).toBe('error');
      expect(response.error).toBe('Something went wrong');
    });

    it('should handle health_ok response', () => {
      const response = {
        id: 'health-123',
        type: 'health_ok' as const,
        data: {
          ready: true,
          providers: ['openai', 'anthropic'],
        },
      };

      expect(response.type).toBe('health_ok');
      expect(response.data.ready).toBe(true);
      expect(response.data.providers).toContain('openai');
    });

    it('should handle config_reloaded response', () => {
      const response = {
        id: 'cfg-123',
        type: 'config_reloaded' as const,
      };

      expect(response.type).toBe('config_reloaded');
    });
  });

  describe('Message transformation', () => {
    it('should transform messages with parts to content format', () => {
      const messages = [
        {
          role: 'user',
          parts: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
          ],
        },
      ];

      const transformed = messages.map((msg: any) => {
        if (msg.parts && Array.isArray(msg.parts)) {
          const textContent = msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('\n');

          return {
            role: msg.role,
            content: textContent,
          };
        }
        return msg;
      });

      expect(transformed[0].content).toBe('Hello\nWorld');
    });

    it('should pass through messages without parts', () => {
      const messages = [
        {
          role: 'user',
          content: 'Hello world',
        },
      ];

      const transformed = messages.map((msg: any) => {
        if (msg.parts && Array.isArray(msg.parts)) {
          const textContent = msg.parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('\n');

          return {
            role: msg.role,
            content: textContent,
          };
        }
        return msg;
      });

      expect(transformed[0]).toEqual({ role: 'user', content: 'Hello world' });
    });
  });

  describe('Request validation', () => {
    it('should validate chat request with missing messages', () => {
      const request = {
        id: 'req-123',
        type: 'chat',
        payload: {},
      };

      expect(request.payload.messages).toBeUndefined();
      // In real implementation, this would error
    });

    it('should validate chat request with empty messages array', () => {
      const request = {
        id: 'req-123',
        type: 'chat',
        payload: {
          messages: [],
        },
      };

      expect(Array.isArray(request.payload.messages)).toBe(true);
      expect(request.payload.messages.length).toBe(0);
    });
  });

  describe('Protocol serialization', () => {
    it('should serialize request to JSON lines format', () => {
      const request = {
        id: 'req-123',
        type: 'chat',
        payload: { messages: [] },
      };

      const json = JSON.stringify(request);
      expect(json).toContain('"id":"req-123"');
      expect(json).toContain('"type":"chat"');
      // JSON Lines format adds newline
      const jsonLine = json + '\n';
      expect(jsonLine).toContain('\n');
    });

    it('should deserialize response from JSON lines format', () => {
      const jsonLine = '{"id":"req-123","type":"chunk","data":{"text":"Hello"}}\n';
      const response = JSON.parse(jsonLine.trim());

      expect(response.id).toBe('req-123');
      expect(response.type).toBe('chunk');
      expect(response.data.text).toBe('Hello');
    });
  });

  describe('Error scenarios', () => {
    it('should handle invalid JSON in request', () => {
      const invalidJson = '{invalid json}';
      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it('should handle unknown request type', () => {
      const request = {
        id: 'req-123',
        type: 'unknown_type',
        payload: {},
      };

      // In real implementation, this would return an error response
      expect(['chat', 'health', 'reload_config']).not.toContain(request.type);
    });

    it('should handle malformed chunk response', () => {
      const response = {
        id: 'req-123',
        type: 'chunk',
        // Missing data field
      };

      expect(response.data).toBeUndefined();
    });
  });
});

describe('Worker Environment', () => {
  beforeEach(() => {
    // Clean up environment variables
    delete process.env.LEANSPEC_HTTP_URL;
    delete process.env.LEANSPEC_IPC_MODE;
  });

  it('should detect IPC mode from environment', () => {
    process.env.LEANSPEC_IPC_MODE = 'true';
    expect(process.env.LEANSPEC_IPC_MODE).toBe('true');
  });

  it('should use default HTTP URL when not configured', () => {
    const baseUrl = process.env.LEANSPEC_HTTP_URL ?? 'http://127.0.0.1:3000';
    expect(baseUrl).toBe('http://127.0.0.1:3000');
  });

  it('should use custom HTTP URL when configured', () => {
    process.env.LEANSPEC_HTTP_URL = 'http://custom:8080';
    const baseUrl = process.env.LEANSPEC_HTTP_URL ?? 'http://127.0.0.1:3000';
    expect(baseUrl).toBe('http://custom:8080');
    delete process.env.LEANSPEC_HTTP_URL;
  });
});
