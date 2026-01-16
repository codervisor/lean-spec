import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@leanspec/ui-components';

export function ChatPage() {
  const { t } = useTranslation('common');
  const enableAi = import.meta.env.VITE_ENABLE_AI === 'true';

  if (!enableAi) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="text-xl font-semibold">{t('chat.disabledTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('chat.disabledDescription')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      {/* TODO: Chat UI Implementation */}
    </div>
  );
}
