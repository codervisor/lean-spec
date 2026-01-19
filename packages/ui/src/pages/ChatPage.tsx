import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent } from '@leanspec/ui-components';
import { ChatContainer } from '../components/chat';
import { ModelPicker } from '../components/chat/ModelPicker';
import { useLeanSpecChat } from '../lib/use-chat';
import { useProject } from '../contexts';
import { Trash2, Settings2, Sliders } from 'lucide-react';
import { useState } from 'react';

export function ChatPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { currentProject, loading: projectLoading } = useProject();
  const enableAi = import.meta.env.VITE_ENABLE_AI !== 'false';
  const [selectedModel, setSelectedModel] = useState<{ providerId: string; modelId: string }>({
    providerId: 'openai',
    modelId: 'gpt-4o',
  });
  const [showSettings, setShowSettings] = useState(false);

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    reload,
    clearChat,
  } = useLeanSpecChat({ 
    providerId: selectedModel.providerId,
    modelId: selectedModel.modelId,
  });

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

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">{t('actions.loading')}</div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-2">
            <h1 className="text-xl font-semibold">{t('projects.errors.noProjectSelected')}</h1>
            <p className="text-sm text-muted-foreground">{t('projects.description')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (message: string) => {
    sendMessage({ text: message });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-lg font-semibold">{t('chat.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('chat.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Model Settings Toggle */}
          <Button
            variant={showSettings ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
            title={t('chat.toggleModelSettings')}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
          {/* Advanced Settings */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('settings')}
            title={t('chat.settings.title')}
          >
            <Sliders className="h-4 w-4" />
          </Button>
          {/* Clear Chat */}
          <Button
            variant="ghost"
            size="icon"
            onClick={clearChat}
            disabled={messages.length === 0}
            title={t('chat.clear')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="px-4 py-2 border-b bg-muted/50">
          <ModelPicker
            value={selectedModel}
            onChange={setSelectedModel}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Chat Container */}
      <ChatContainer
        messages={messages}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={error as Error | null}
        onRetry={reload}
        className="flex-1 min-h-0"
      />
    </div>
  );
}
