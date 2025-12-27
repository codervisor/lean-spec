import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@leanspec/ui-components';
import { ContextClient } from '../components/context/ContextClient';
import { ContextPageSkeleton } from '../components/shared/Skeletons';
import { useProject } from '../contexts';
import { useTranslation } from 'react-i18next';

export function ContextPage() {
  const { currentProject, loading, error } = useProject();
  const { t } = useTranslation(['common', 'errors']);

  if (loading) {
    return <ContextPageSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <div className="flex justify-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="text-lg font-semibold">{t('projectNotFound', { ns: 'errors' })}</div>
          <p className="text-sm text-muted-foreground">{error || t('errors.loadingError', { ns: 'errors' })}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('contextPage.title')}</h1>
        <p className="text-muted-foreground text-sm">
          {t('contextPage.description')}
        </p>
      </div>

      <ContextClient projectRoot={currentProject?.path || currentProject?.specsDir || undefined} />
    </div>
  );
}
