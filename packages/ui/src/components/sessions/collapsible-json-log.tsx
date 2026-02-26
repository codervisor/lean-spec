import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/library';

function extractJsonSummary(raw: string): string {
  try {
    const parsed = JSON.parse(raw.trim());
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      if (typeof parsed.message === 'string') return parsed.message;
      if (typeof parsed.method === 'string') return parsed.method;
      if (typeof parsed.type === 'string') return parsed.type;
    }
    return raw.trim().slice(0, 120) + (raw.trim().length > 120 ? '…' : '');
  } catch {
    return raw.trim().slice(0, 120) + (raw.trim().length > 120 ? '…' : '');
  }
}

export function CollapsibleJsonLog({ timestamp, level, rawMessage }: { timestamp: string; level: string; rawMessage: string }) {
  const [expanded, setExpanded] = useState(false);
  const summary = extractJsonSummary(rawMessage);

  let formatted = rawMessage;
  try {
    formatted = JSON.stringify(JSON.parse(rawMessage.trim()), null, 2);
  } catch {
    // keep raw
  }

  return (
    <div className="font-mono text-xs text-muted-foreground relative">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center hover:text-foreground transition-colors text-left w-full"
      >
        <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform -ml-4 mr-1", expanded && "rotate-90")} />
        <span className="truncate">
          [{timestamp}] {level.toUpperCase()} {summary}
        </span>
      </button>
      {expanded && (
        <pre className="mt-1 whitespace-pre-wrap text-emerald-600 dark:text-emerald-400 text-[11px] overflow-x-auto pl-0">
          {formatted}
        </pre>
      )}
    </div>
  );
}
