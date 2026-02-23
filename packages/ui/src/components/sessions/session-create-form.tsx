import { useState, useEffect } from 'react';
import { useSessionMutations } from '../../hooks/useSessionsQuery';
import { useCurrentProject } from '../../hooks/useProjectQuery';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/library';
import { Play } from 'lucide-react';
import { api } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import type { SessionMode } from '../../types/api';

interface SessionCreateFormProps {
    onCancel: () => void;
    onSuccess: () => void;
    defaultSpecId?: string;
}

export function SessionCreateForm({ onCancel, onSuccess, defaultSpecId }: SessionCreateFormProps) {
    const { t } = useTranslation('common');
    const { currentProject } = useCurrentProject();
    const { createSession, startSession } = useSessionMutations(currentProject?.id ?? null);
    const [specId, setSpecId] = useState(defaultSpecId || '');
    const [runners, setRunners] = useState<string[]>([]);
    const [runner, setRunner] = useState('claude');
    const [mode, setMode] = useState<SessionMode>('autonomous');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadRunners = async () => {
            try {
                const available = await api.listAvailableRunners();
                setRunners(available.length ? available : ['claude', 'copilot', 'codex', 'opencode', 'aider', 'cline']);
            } catch {
                setRunners(['claude', 'copilot', 'codex', 'opencode', 'aider', 'cline']);
            }
        };
        void loadRunners();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (!currentProject?.path) throw new Error('No project path');
            const session = await createSession({
                projectPath: currentProject.path,
                specId,
                runner,
                mode,
            });
            await startSession(session.id);
            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-md p-3 bg-muted/20">
            <h3 className="font-semibold text-sm mb-3">{t('sessions.actions.new')}</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium">{t('sessions.labels.specId')}</label>
                    <Input
                        value={specId}
                        onChange={(event) => setSpecId(event.target.value)}
                        placeholder={t('sessions.labels.specIdPlaceholder')}
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <label className="text-xs font-medium">{t('sessions.labels.runner')}</label>
                        <Select value={runner} onValueChange={setRunner}>
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder={t('sessions.labels.runner')} />
                            </SelectTrigger>
                            <SelectContent>
                                {runners.map(value => (
                                    <SelectItem key={value} value={value} className="cursor-pointer">
                                        {value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">{t('sessions.labels.mode')}</label>
                        <Select value={mode} onValueChange={(value) => setMode(value as SessionMode)}>
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder={t('sessions.labels.mode')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="autonomous" className="cursor-pointer">{t('sessions.modes.autonomous')}</SelectItem>
                                <SelectItem value="guided" className="cursor-pointer">{t('sessions.modes.guided')}</SelectItem>
                                <SelectItem value="ralph" className="cursor-pointer">{t('sessions.modes.ralph')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="flex-1">
                        {t('actions.cancel')}
                    </Button>
                    <Button type="submit" size="sm" className="flex-1 gap-1" disabled={loading}>
                        <Play className="h-3 w-3" /> {t('sessions.actions.createAndStart')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
