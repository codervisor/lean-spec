import { useState, useEffect } from 'react';
import { useSessions } from '../../contexts/SessionsContext';
import { Button } from '@leanspec/ui-components';
import { Play } from 'lucide-react';
import { api } from '../../lib/api';

interface SessionCreateFormProps {
    onCancel: () => void;
    onSuccess: () => void;
    defaultSpecId?: string;
}

export function SessionCreateForm({ onCancel, onSuccess, defaultSpecId }: SessionCreateFormProps) {
    const { createSession } = useSessions();
    const [specId, setSpecId] = useState(defaultSpecId || '');
    const [tools, setTools] = useState<string[]>([]);
    const [tool, setTool] = useState('claude');
    const [mode, setMode] = useState('autonomous');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadTools = async () => {
          try {
            const available = await api.listAvailableTools();
            setTools(available.length ? available : ['claude', 'copilot', 'codex', 'opencode']);
          } catch {
            setTools(['claude', 'copilot', 'codex', 'opencode']);
          }
        };
        void loadTools();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const session = await createSession({ specId, tool, mode: mode as any });
            // Auto start session
            await api.startSession(session.id);
            onSuccess();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-md p-3 bg-muted/20">
            <h3 className="font-semibold text-sm mb-3">New Session</h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium">Spec ID</label>
                    <input 
                        className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                        value={specId} 
                        onChange={e => setSpecId(e.target.value)} 
                        placeholder="Expected Spec ID"
                    />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <label className="text-xs font-medium">Tool</label>
                        <select 
                            className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={tool}
                            onChange={e => setTool(e.target.value)}
                        >
                            {tools.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium">Mode</label>
                        <select 
                            className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={mode}
                            onChange={e => setMode(e.target.value)}
                        >
                            <option value="autonomous">Autonomous</option>
                            <option value="guided">Guided</option>
                            <option value="ralph">Ralph</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="flex-1">
                        Cancel
                    </Button>
                    <Button type="submit" size="sm" className="flex-1 gap-1" disabled={loading}>
                        <Play className="h-3 w-3" /> Create & Start
                    </Button>
                </div>
            </form>
        </div>
    );
}
