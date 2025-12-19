import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, type SpecDetail } from '../lib/api';

export function SpecDetailPage() {
  const { specName } = useParams<{ specName: string }>();
  const [spec, setSpec] = useState<SpecDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!specName) return;
    
    setLoading(true);
    api.getSpec(specName)
      .then(setSpec)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [specName]);

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
      <Link 
        to="/specs" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to specs
      </Link>

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
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {spec.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
