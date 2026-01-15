import { useMemo, useState } from 'react';
import { Cpu, Pencil, PlugZap, WifiOff, Zap } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, Input } from '@leanspec/ui-components';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/shared/PageHeader';
import { useLayout, useMachine } from '../contexts';
import { cn } from '../lib/utils';

export function MachinesPage() {
  const { t } = useTranslation('common');
  const { isWideMode } = useLayout();
  const {
    machines,
    loading,
    renameMachine,
    revokeMachine,
    requestExecution,
  } = useMachine();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');

  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => a.label.localeCompare(b.label));
  }, [machines]);

  const startEditing = (id: string, label: string) => {
    setEditingId(id);
    setEditingLabel(label);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingLabel('');
  };

  const saveLabel = async (id: string) => {
    if (!editingLabel.trim()) return;
    await renameMachine(id, editingLabel.trim());
    cancelEditing();
  };

  const triggerExecution = async (id: string) => {
    await requestExecution(id, { source: 'ui', requestedAt: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className={cn('container mx-auto py-6 space-y-6 px-4', isWideMode ? 'max-w-full' : 'max-w-7xl')}>
          <PageHeader
            title={t('machines.title')}
            description={t('machines.description')}
          />
        </div>
      </div>

      <div className={cn('container mx-auto py-8 px-4', isWideMode ? 'max-w-full' : 'max-w-7xl')}>
        {loading && (
          <div className="text-sm text-muted-foreground">{t('actions.loading')}</div>
        )}

        {!loading && sortedMachines.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
            {t('machines.empty')}
          </div>
        )}

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {sortedMachines.map((machine) => (
            <Card key={machine.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                      <Cpu className="h-4 w-4" />
                    </div>
                    <div>
                      {editingId === machine.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingLabel}
                            onChange={(event) => setEditingLabel(event.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') void saveLabel(machine.id);
                              if (event.key === 'Escape') cancelEditing();
                            }}
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => void saveLabel(machine.id)}>
                            <PlugZap className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base">{machine.label}</h3>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEditing(machine.id, machine.label)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">{machine.id}</p>
                    </div>
                  </div>
                  <div className={cn(
                    'text-xs uppercase font-semibold',
                    machine.status === 'online' ? 'text-emerald-500' : 'text-destructive'
                  )}>
                    {machine.status === 'online' ? t('machines.status.online') : t('machines.status.offline')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {machine.status === 'online' ? (
                    <PlugZap className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span>{t('machines.projectsCount', { count: machine.projectCount ?? 0 })}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void triggerExecution(machine.id)}>
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    {t('machines.requestExecution')}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => void revokeMachine(machine.id)}>
                    {t('machines.revoke')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
