import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSessions } from './useSessionsQuery';
import type { Session } from '../types/api';
import { useToast } from '../contexts';

function getSessionLabel(session: Session): string {
  const prompt = session.prompt?.trim();
  if (prompt) return prompt.length > 60 ? `${prompt.slice(0, 57)}...` : prompt;
  return session.id.slice(0, 8);
}

/**
 * Emits user-facing toasts for meaningful session lifecycle changes.
 */
export function useSessionStatusToasts(projectId: string | null) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const sessionsQuery = useSessions(projectId);
  const seenStatusesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const sessions = sessionsQuery.data ?? [];
    if (!sessions.length) return;

    const previous = seenStatusesRef.current;
    const next = new Map<string, string>();

    for (const session of sessions) {
      const prevStatus = previous.get(session.id);
      next.set(session.id, session.status);

      // Prime cache on first observation without toasting.
      if (!prevStatus) continue;
      if (prevStatus === session.status) continue;

      const label = getSessionLabel(session);
      if (session.status === 'completed') {
        toast({
          title: t('sessions.toasts.completedTitle'),
          description: t('sessions.toasts.completedDescription', { session: label }),
          variant: 'success',
        });
        continue;
      }

      if (session.status === 'failed') {
        toast({
          title: t('sessions.toasts.failedTitle'),
          description: t('sessions.toasts.failedDescription', { session: label }),
          variant: 'error',
        });
        continue;
      }

      if (session.status === 'paused') {
        toast({
          title: t('sessions.toasts.attentionTitle'),
          description: t('sessions.toasts.attentionDescription', { session: label }),
          variant: 'default',
        });
      }
    }

    seenStatusesRef.current = next;
  }, [sessionsQuery.data, t, toast]);
}
