import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, type SpecDetail, type Spec } from '../lib/api';
import { MermaidDiagram } from '../components/MermaidDiagram';

function MetadataEditor({ 
  spec, 
  onSave, 
  onCancel 
}: { 
  spec: SpecDetail; 
  onSave: (updates: Partial<Spec>) => Promise<void>;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(spec.status);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(spec.priority || 'medium');
  const [tags, setTags] = useState(spec.tags?.join(', ') || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        status,
        priority: priority as 'low' | 'medium' | 'high',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-6 space-y-4 bg-secondary/30">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Edit Metadata</h3>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-3 py-1 text-sm border rounded hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 inline mr-1" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4 inline mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2 bg-destructive/10 text-destructive text-sm rounded">
          Error: {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium block mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Spec['status'])}
            className="w-full px-3 py-2 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium block mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="w-full px-3 py-2 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g., ui, api, feature"
          className="w-full px-3 py-2 border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}

export function SpecDetailPage() {
  const { specName } = useParams<{ specName: string }>();
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadSpec = async () => {
    if (!specName) return;
    
    setLoading(true);
    try {
      const data = await api.getSpec(specName);
      setSpec(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpec();
  }, [specName]);

  const handleSave = async (updates: Partial<Spec>) => {
    if (!specName) return;
    await api.updateSpec(specName, updates);
    await loadSpec();
    setEditing(false);
  };

  if (loading) {
    return <div className="text-center py-12">Loading spec...</div>;
  }

  if (error || !spec) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive">Error loading spec: {error || 'Not found'}</div>
        <Link to="/specs" className="text-sm text-primary hover:underline mt-4 inline-block">
          Back to specs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link 
          to="/specs" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to specs
        </Link>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-secondary transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Metadata
          </button>
        )}
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{spec.title}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{spec.name}</span>
          <span>•</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${
            spec.status === 'complete'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : spec.status === 'in-progress'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
          }`}>
            {spec.status}
          </span>
          {spec.priority && (
            <>
              <span>•</span>
              <span>{spec.priority} priority</span>
            </>
          )}
        </div>
      </div>

      {editing && (
        <MetadataEditor 
          spec={spec} 
          onSave={handleSave} 
          onCancel={() => setEditing(false)} 
        />
      )}

      {spec.tags && spec.tags.length > 0 && (
        <div className="flex gap-2 mb-6">
          {spec.tags.map((tag) => (
            <span key={tag} className="text-xs px-2 py-1 bg-secondary rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {(spec.depends_on && spec.depends_on.length > 0) || (spec.required_by && spec.required_by.length > 0) && (
        <div className="border rounded-lg p-4 mb-6 space-y-2">
          {spec.depends_on && spec.depends_on.length > 0 && (
            <div>
              <span className="text-sm font-medium">Depends on:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {spec.depends_on.map((dep) => (
                  <Link
                    key={dep}
                    to={`/specs/${dep}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {dep}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {spec.required_by && spec.required_by.length > 0 && (
            <div>
              <span className="text-sm font-medium">Required by:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {spec.required_by.map((dep) => (
                  <Link
                    key={dep}
                    to={`/specs/${dep}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {dep}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({ className, children, ...props }: any) {
              const inline = !className?.includes('language-');
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : null;
              const code = String(children).replace(/\n$/, '');
              
              // Render mermaid diagrams
              if (!inline && language === 'mermaid') {
                return <MermaidDiagram chart={code} className="my-4" />;
              }
              
              // Regular code blocks
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {spec.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
