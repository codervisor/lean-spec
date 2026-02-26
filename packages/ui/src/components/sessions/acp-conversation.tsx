import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
  Message,
  MessageContent,
  MessageResponse,
  Plan,
  PlanAction,
  PlanContent,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  Tool,
  ToolBody,
  ToolContent,
  ToolHeader,
} from '@/library';
import type { SessionStreamEvent } from '../../types/api';
import { useTranslation } from 'react-i18next';
import { cn } from '@/library';
import { CollapsibleJsonLog } from './collapsible-json-log';

function formatTimeAgo(ts: string | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString();
}

function toToolState(status: 'running' | 'completed' | 'failed'):
  | 'input-available'
  | 'output-available'
  | 'output-error' {
  if (status === 'completed') return 'output-available';
  if (status === 'failed') return 'output-error';
  return 'input-available';
}

function toPlanEntryClass(status: 'pending' | 'running' | 'done'): string {
  if (status === 'done') return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'running') return 'text-primary';
  return 'text-muted-foreground';
}

interface AcpConversationProps {
  events: SessionStreamEvent[];
  loading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  onPermissionResponse?: (permissionId: string, option: string) => void;
  isPermissionResponding?: (permissionId: string) => boolean;
}

export function AcpConversation({
  events,
  loading = false,
  emptyTitle,
  emptyDescription,
  onPermissionResponse,
  isPermissionResponding,
  className,
}: AcpConversationProps & { className?: string }) {
  const { t } = useTranslation('common');

  return (
    <Conversation className={cn("min-h-0 rounded-lg border border-border bg-muted/20 flex flex-col overflow-hidden", className)}>
      <ConversationContent className="gap-3 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-xs text-muted-foreground">{t('actions.loading')}</div>
        ) : events.length === 0 ? (
          <ConversationEmptyState title={emptyTitle} description={emptyDescription} className="py-8" />
        ) : (
          events.map((event, index) => {
            const timeAgo = 'timestamp' in event ? formatTimeAgo(event.timestamp) : null;
            const timestampEl = timeAgo ? (
              <span className="text-[10px] text-muted-foreground/50 ml-1 font-normal">{timeAgo}</span>
            ) : null;
            switch (event.type) {
              case 'acp_message':
                if (event.role === 'user') {
                  return (
                    <Message key={`acp-message-${index}`} from="user">
                      <MessageContent>
                        <div className="flex items-baseline gap-1">
                          <span className="flex-1">{event.content}</span>
                          {timestampEl}
                        </div>
                      </MessageContent>
                    </Message>
                  );
                }
                return (
                  <Message key={`acp-message-${index}`} from="assistant">
                    <MessageContent>
                      <MessageResponse>{event.content}</MessageResponse>
                      {timestampEl}
                    </MessageContent>
                  </Message>
                );

              case 'acp_thought':
                return (
                  <Reasoning key={`acp-thought-${index}`} isStreaming={!event.done} defaultOpen>
                    <ReasoningTrigger />
                    <ReasoningContent>{event.content}</ReasoningContent>
                  </Reasoning>
                );

              case 'acp_tool_call':
                return (
                  <Tool key={`acp-tool-${event.id}`} defaultOpen={event.status === 'running'}>
                    <ToolHeader
                      type="dynamic-tool"
                      toolName={event.tool}
                      state={toToolState(event.status)}
                    />
                    <ToolContent>
                      <ToolBody
                        input={event.args}
                        output={event.result as string | undefined}
                        rawOutput={event.result}
                      />
                    </ToolContent>
                  </Tool>
                );

              case 'acp_plan': {
                const completed = event.entries.filter((entry) => entry.status === 'done').length;
                const total = event.entries.length;
                return (
                  <Plan key={`acp-plan-${index}`} isStreaming={!event.done} defaultOpen>
                    <PlanHeader>
                      <PlanTitle>{t('sessions.labels.plan')}</PlanTitle>
                      <PlanAction>
                        <PlanTrigger />
                      </PlanAction>
                    </PlanHeader>
                    <PlanContent className="space-y-2">
                      <div className="text-xs text-muted-foreground">{t('sessions.labels.planProgress', { completed, total })}</div>
                      <div className="space-y-1 text-sm">
                        {event.entries.map((entry) => (
                          <div key={entry.id} className={toPlanEntryClass(entry.status)}>
                            {entry.status === 'done' ? '✓' : entry.status === 'running' ? '⟳' : '○'} {entry.title}
                          </div>
                        ))}
                      </div>
                    </PlanContent>
                  </Plan>
                );
              }

              case 'acp_permission_request': {
                const responding = isPermissionResponding?.(event.id) ?? false;
                return (
                  <Tool key={`acp-permission-${event.id}`} defaultOpen>
                    <ToolHeader type="dynamic-tool" toolName={event.tool} state="approval-requested" />
                    <ToolContent>
                      <ToolBody input={{ tool: event.tool, args: event.args, options: event.options }} />
                      <div className="flex flex-wrap gap-2 pt-2">
                        {event.options.map((option) => (
                          <button
                            key={`${event.id}-${option}`}
                            type="button"
                            disabled={responding || !onPermissionResponse}
                            onClick={() => onPermissionResponse?.(event.id, option)}
                            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t(`sessions.permissions.${option}`, { defaultValue: option })}
                          </button>
                        ))}
                        {responding ? (
                          <span className="text-xs text-muted-foreground">{t('sessions.permissions.responding')}</span>
                        ) : null}
                      </div>
                    </ToolContent>
                  </Tool>
                );
              }

              case 'acp_mode_update':
                return (
                  <div key={`acp-mode-${index}`} className="text-xs text-muted-foreground">
                    {t('sessions.labels.mode')}: {event.mode}
                  </div>
                );

              case 'complete':
                return (
                  <div key={`acp-complete-${index}`} className="text-xs text-muted-foreground">
                    {t('sessions.labels.status')}: {event.status} ({event.duration_ms}ms)
                  </div>
                );

              case 'log':
              default: {
                const trimmed = event.message.trim();
                const isJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || 
                               (trimmed.startsWith('[') && trimmed.endsWith(']'));

                if (isJson) {
                  return (
                    <CollapsibleJsonLog
                      key={`acp-log-${index}`}
                      timestamp={event.timestamp}
                      level={event.level}
                      rawMessage={event.message}
                    />
                  );
                }

                return (
                  <div key={`acp-log-${index}`} className="font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                    [{event.timestamp}] {event.level.toUpperCase()} {event.message}
                  </div>
                );
              }
            }
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
