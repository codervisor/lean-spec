import type { Session, SessionLog, SessionStreamEvent } from '../types/api';

export type AcpFilterType = 'messages' | 'thoughts' | 'tools' | 'plan';

const ACP_EVENT_TYPES = new Set<SessionStreamEvent['type']>([
  'acp_message',
  'acp_thought',
  'acp_tool_call',
  'acp_plan',
  'acp_permission_request',
  'acp_mode_update',
  'complete',
  'log',
]);

export function isAcpSession(session?: Session | null): boolean {
  return (session?.protocol ?? 'subprocess') === 'acp';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function parseRawEvent(payload: unknown): SessionStreamEvent | null {
  if (!isRecord(payload)) return null;
  const type = asString(payload.type);
  if (!ACP_EVENT_TYPES.has(type as SessionStreamEvent['type'])) return null;

  switch (type) {
    case 'log':
      return {
        type: 'log',
        timestamp: asString(payload.timestamp),
        level: asString(payload.level),
        message: asString(payload.message),
      };
    case 'acp_message':
      return {
        type: 'acp_message',
        timestamp: asString(payload.timestamp) || undefined,
        role: payload.role === 'user' ? 'user' : 'agent',
        content: asString(payload.content),
        done: asBoolean(payload.done),
      };
    case 'acp_thought':
      return {
        type: 'acp_thought',
        timestamp: asString(payload.timestamp) || undefined,
        content: asString(payload.content),
        done: asBoolean(payload.done),
      };
    case 'acp_tool_call':
      return {
        type: 'acp_tool_call',
        timestamp: asString(payload.timestamp) || undefined,
        id: asString(payload.id),
        tool: asString(payload.tool),
        args: isRecord(payload.args) ? payload.args : {},
        status: payload.status === 'completed' || payload.status === 'failed' ? payload.status : 'running',
        result: payload.result,
      };
    case 'acp_plan':
      return {
        type: 'acp_plan',
        timestamp: asString(payload.timestamp) || undefined,
        entries: asArray(payload.entries).map((entry, index) => {
          if (!isRecord(entry)) {
            return { id: String(index), title: '', status: 'pending' as const };
          }
          const status = entry.status === 'done' || entry.status === 'running' ? entry.status : 'pending';
          return {
            id: asString(entry.id, String(index)),
            title: asString(entry.title),
            status,
          };
        }),
        done: typeof payload.done === 'boolean' ? payload.done : undefined,
      };
    case 'acp_permission_request':
      return {
        type: 'acp_permission_request',
        timestamp: asString(payload.timestamp) || undefined,
        id: asString(payload.id),
        tool: asString(payload.tool),
        args: isRecord(payload.args) ? payload.args : {},
        options: asArray(payload.options).filter((option): option is string => typeof option === 'string'),
      };
    case 'acp_mode_update':
      return {
        type: 'acp_mode_update',
        timestamp: asString(payload.timestamp) || undefined,
        mode: asString(payload.mode),
      };
    case 'complete':
      return {
        type: 'complete',
        status: asString(payload.status),
        duration_ms: typeof payload.duration_ms === 'number' ? payload.duration_ms : 0,
      };
    default:
      return null;
  }
}

export function parseStreamEventPayload(payload: unknown): SessionStreamEvent | null {
  return parseRawEvent(payload);
}

export function parseSessionLog(log: SessionLog): SessionStreamEvent {
  let parsedMessage: unknown = null;
  try {
    parsedMessage = JSON.parse(log.message);
  } catch {
    parsedMessage = null;
  }

  const parsed = parseRawEvent(parsedMessage);
  if (parsed) {
    if ('timestamp' in parsed && !parsed.timestamp) {
      return { ...parsed, timestamp: log.timestamp };
    }
    return parsed;
  }

  if (log.level.startsWith('acp_')) {
    const fallback = parseRawEvent({
      type: log.level,
      timestamp: log.timestamp,
      content: log.message,
      role: 'agent',
      done: true,
    });
    if (fallback) return fallback;
  }

  return {
    type: 'log',
    timestamp: log.timestamp,
    level: log.level,
    message: log.message,
  };
}

export function appendStreamEvent(events: SessionStreamEvent[], next: SessionStreamEvent): SessionStreamEvent[] {
  const current = [...events];
  const last = current[current.length - 1];

  if (next.type === 'acp_message' && last?.type === 'acp_message' && last.role === next.role && !last.done) {
    current[current.length - 1] = {
      ...last,
      content: `${last.content}${next.content}`,
      done: next.done,
      timestamp: next.timestamp ?? last.timestamp,
    };
    return current;
  }

  if (next.type === 'acp_thought' && last?.type === 'acp_thought' && !last.done) {
    current[current.length - 1] = {
      ...last,
      content: `${last.content}${next.content}`,
      done: next.done,
      timestamp: next.timestamp ?? last.timestamp,
    };
    return current;
  }

  if (next.type === 'acp_tool_call') {
    const index = current.findIndex((event) => event.type === 'acp_tool_call' && event.id === next.id);
    if (index >= 0) {
      const existing = current[index];
      if (existing.type === 'acp_tool_call') {
        current[index] = {
          ...existing,
          ...next,
          args: Object.keys(next.args).length > 0 ? next.args : existing.args,
          result: next.result ?? existing.result,
        };
      }
      return current;
    }
  }

  if (next.type === 'acp_plan') {
    let index = -1;
    for (let i = current.length - 1; i >= 0; i -= 1) {
      if (current[i]?.type === 'acp_plan') {
        index = i;
        break;
      }
    }
    if (index >= 0) {
      current[index] = next;
      return current;
    }
  }

  current.push(next);
  return current;
}

export function getAcpFilterType(event: SessionStreamEvent): AcpFilterType | null {
  switch (event.type) {
    case 'acp_message':
      return 'messages';
    case 'acp_thought':
      return 'thoughts';
    case 'acp_tool_call':
    case 'acp_permission_request':
      return 'tools';
    case 'acp_plan':
      return 'plan';
    default:
      return null;
  }
}

export function getActiveToolCall(events: SessionStreamEvent[]): { tool: string; id: string } | null {
  const active = [...events]
    .reverse()
    .find((event) => event.type === 'acp_tool_call' && event.status === 'running');
  if (!active || active.type !== 'acp_tool_call') return null;
  return { tool: active.tool, id: active.id };
}

export function getPlanProgress(events: SessionStreamEvent[]): { completed: number; total: number } | null {
  const plan = [...events].reverse().find((event) => event.type === 'acp_plan');
  if (!plan || plan.type !== 'acp_plan') return null;
  const total = plan.entries.length;
  const completed = plan.entries.filter((entry) => entry.status === 'done').length;
  if (total === 0) return null;
  return { completed, total };
}
