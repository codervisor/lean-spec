import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Clock } from 'lucide-react';
import { api, type Spec as APISpec } from '../lib/api';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { cn } from '../lib/utils';

interface QuickSearchSpec extends APISpec {
  id: string;
  specNumber?: string;
}

export function QuickSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [specs, setSpecs] = useState<QuickSearchSpec[]>([]);

  useEffect(() => {
    api.getSpecs()
      .then((data) => {
        const withIds = data.map((spec) => {
          const match = spec.name?.match(/^(\d+)-/);
          return {
            ...spec,
            id: spec.name || crypto.randomUUID(),
            specNumber: match ? match[1] : undefined,
          };
        });
        setSpecs(withIds);
      })
      .catch(() => {
        // Swallow errors; quick search is best-effort
      });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('leanspec-recent-searches');
    if (stored) {
      try {
        setRecent(JSON.parse(stored));
      } catch {
        setRecent([]);
      }
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return specs.slice(0, 8);
    const q = search.toLowerCase();
    return specs.filter((spec) => {
      const inName = spec.name?.toLowerCase().includes(q);
      const inTitle = spec.title?.toLowerCase().includes(q);
      const inTags = spec.tags?.some((tag) => tag.toLowerCase().includes(q));
      return inName || inTitle || inTags;
    }).slice(0, 12);
  }, [specs, search]);

  const handleSelect = (specName: string, label: string) => {
    const next = [label, ...recent.filter((r) => r !== label)].slice(0, 5);
    setRecent(next);
    localStorage.setItem('leanspec-recent-searches', JSON.stringify(next));
    setOpen(false);
    setSearch('');
    navigate(`/specs/${specName}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-2 sm:px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-md hover:border-foreground/20"
        aria-label="Open quick search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Quick search...</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl rounded-lg border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center border-b px-4 py-3 gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search specs by name, title, or tags"
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {!search && recent.length > 0 && (
                <div className="px-4 py-3 border-b">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Recent searches</div>
                  <div className="space-y-1">
                    {recent.map((item) => (
                      <button
                        key={item}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-muted/70 text-sm flex items-center gap-2"
                        onClick={() => setSearch(item)}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{item}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-2 space-y-1">
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-6 text-center">No results</div>
                )}
                {filtered.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => handleSelect(spec.name, spec.title || spec.name)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {spec.specNumber && (
                            <span className="text-xs font-mono text-muted-foreground">#{spec.specNumber}</span>
                          )}
                          <span className="font-medium truncate">{spec.title || spec.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{spec.name}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {spec.status && <StatusBadge status={spec.status} className="text-[11px]" />}
                        {spec.priority && <PriorityBadge priority={spec.priority} className="text-[11px]" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
