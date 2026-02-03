/**
 * Project Context Page
 * Displays project-level context files for AI agents and development workflows
 * Spec 131 - UI Project Context Visibility
 */

import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@leanspec/ui-components';
import { ContextClient } from '../components/context/ContextClient';
import { ContextPageSkeleton } from '../components/shared/Skeletons';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import type { ProjectContext } from '../types/api';

export function ContextPage() {
  const { currentProject, loading: projectLoading, error: projectError } = useCurrentProject();
  const { t } = useTranslation(['common', 'errors']);
  const [context, setContext] = useState<ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContext() {
      // Wait for project loading to complete before attempting to load context
      if (projectLoading) {
        return;
      }

      if (!currentProject?.id) {
        setContext(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const projectContext = await api.getProjectContext();
        setContext(projectContext);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('contextPage.errors.list', { ns: 'common' });
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadContext();
  }, [currentProject?.id, projectLoading, t]);

  if (projectLoading || loading) {
    return <ContextPageSkeleton />;
  }

  // Handle actual API/project errors (only show project errors if they're real errors, not "no projects" state)
  if (error && currentProject) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">{t('contextPage.errors.loadFailed', { ns: 'common' })}</div>
          <p className="text-sm text-muted-foreground">
            {projectError || error || t('errors.loadingError', { ns: 'errors' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  // No project selected - guide user to create/select one
  if (!currentProject) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">{t('contextPage.errors.noProject', { ns: 'common' })}</div>
          <p className="text-sm text-muted-foreground">
            {t('contextPage.errors.noProjectDescription', { ns: 'common' })}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!context) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-lg font-semibold">{t('contextPage.emptyState.title')}</div>
          <p className="text-sm text-muted-foreground">
            {t('contextPage.emptyState.description')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return <ContextClient context={context} />;
}

