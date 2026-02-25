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
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/library';
import type { SessionStreamEvent } from '../../types/api';
import { useTranslation } from 'react-i18next';

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
}

export function AcpConversation({ events, loading = false, emptyTitle, emptyDescription }: AcpConversationProps) {
  const { t } = useTranslation('common');

  return (
    <Conversation className="min-h-0 rounded-lg border border-border bg-muted/20">
      <ConversationContent className="gap-3">
        {loading ? (
          <div className="text-xs text-muted-foreground">{t('actions.loading')}</div>
        ) : events.length === 0 ? (
          <ConversationEmptyState title={emptyTitle} description={emptyDescription} className="py-8" />
        ) : (
          events.map((event, index) => {
            switch (event.type) {
              case 'acp_message':
                if (event.role === 'user') {
                  return (
                    <Message key={`acp-message-${index}`} from="user">
                      <MessageContent>{event.content}</MessageContent>
                    </Message>
                  );
                }
                return (
                  <Message key={`acp-message-${index}`} from="assistant">
                    <MessageContent>
                      <MessageResponse>{event.content}</MessageResponse>
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
                      <ToolInput input={event.args} />
                      <ToolOutput output={event.result as string | undefined} rawOutput={event.result} />
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

              case 'acp_permission_request':
                return (
                  <Tool key={`acp-permission-${event.id}`} defaultOpen>
                    <ToolHeader type="dynamic-tool" toolName={event.tool} state="approval-requested" />
                    <ToolContent>
                      <ToolInput input={{ tool: event.tool, args: event.args, options: event.options }} />
                    </ToolContent>
                  </Tool>
                );

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
              default:
                return (
                  <div key={`acp-log-${index}`} className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                    [{event.timestamp}] {event.level.toUpperCase()} {event.message}
                  </div>
                );
            }
          })
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
