import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Fuse from 'fuse.js';
import { Clock, FileText, Search, Tag } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Button,
} from '@leanspec/ui-components';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { useTranslation } from 'react-i18next';
import type { Spec } from '../types/api';
import { api } from '../lib/api';
import { useCurrentProject } from '../hooks/useProjectQuery';
import { useSearchStore } from '../stores/search';

const formatSpecNumber = (specNumber: number | null) =>
  specNumber != null ? specNumber.toString().padStart(3, '0') : null;

export function QuickSearch() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useCurrentProject();
  const resolvedProjectId = projectId ?? currentProject?.id;
  const basePath = resolvedProjectId ? `/projects/${resolvedProjectId}` : '/projects';
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { recentSearches, addRecentSearch } = useSearchStore();
  const [specs, setSpecs] = useState<Spec[]>([]);
  const { t } = useTranslation('common');

  useEffect(() => {
    api.getSpecs()
      .then((data) => setSpecs(data))
      .catch(() => {
        // Quick search is best-effort; ignore failures
      });
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

  useEffect(() => {
    const handler = (event: Event) => {
      const desktopEvent = event as CustomEvent<{ action?: string }>;
      if (desktopEvent.detail?.action === 'desktop://menu-find') {
        setOpen(true);
      }
    };

    window.addEventListener('leanspec:desktop-menu', handler as EventListener);
    return () => window.removeEventListener('leanspec:desktop-menu', handler as EventListener);
  }, []);

  const fuse = useMemo(
    () =>
      new Fuse(specs, {
        keys: [
          { name: 'title', weight: 2 },
          { name: 'specNumber', weight: 1.5 },
          { name: 'specName', weight: 1 },
          { name: 'tags', weight: 0.5 },
        ],
        threshold: 0.4,
        includeScore: true,
        minMatchCharLength: 2,
      }),
    [specs]
  );

  const results = useMemo(() => {
    if (!search) {
      // Sort by specNumber descending (newest first) for default view
      return [...specs].sort((a, b) => (b.specNumber ?? 0) - (a.specNumber ?? 0)).slice(0, 8);
    }
    return fuse.search(search).map((result) => result.item).slice(0, 12);
  }, [search, fuse, specs]);

  const tagSuggestions = useMemo(() => {
    const allTags = Array.from(new Set(specs.flatMap((s) => s.tags || [])));
    if (!search) return allTags.slice(0, 5);
    const query = search.toLowerCase();
    return allTags
      .filter((tag) => tag.toLowerCase().includes(query))
      .slice(0, 5);
  }, [specs, search]);

  const handleSelect = (spec: Spec) => {
    const label = spec.title || spec.specName;
    addRecentSearch(label);
    setOpen(false);
    setSearch('');
    navigate(`${basePath}/specs/${spec.specName}`);
  };

  const handleTagSelect = (tag: string) => {
    navigate(`${basePath}/specs?tag=${encodeURIComponent(tag)}`);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground hover:text-foreground"
        aria-label={t('quickSearch.open')}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('quickSearch.button')}</span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setSearch('');
        }}
      >
        <CommandInput
          placeholder={t('quickSearch.placeholder')}
          value={search}
          onValueChange={setSearch}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setSearch('');
            }
          }}
        />
        <CommandList>
          <CommandEmpty>{t('search.noResults')}</CommandEmpty>

          {!search && recentSearches.length > 0 && (
            <CommandGroup heading={t('quickSearch.recentSearches')}>
              {recentSearches.map((recent) => (
                <CommandItem
                  key={recent}
                  value={recent}
                  onSelect={() => setSearch(recent)}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  {recent}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading={t('spec.specs')}>
            {results.map((spec) => {
              const specNumber = formatSpecNumber(spec.specNumber ?? null);
              const label = spec.title || spec.specName;
              return (
                <CommandItem
                  key={spec.specName}
                  value={`${specNumber ? `#${specNumber}` : ''} ${label}`.trim()}
                  onSelect={() => handleSelect(spec)}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {specNumber && (
                          <span className="text-xs font-mono text-muted-foreground">#{specNumber}</span>
                        )}
                        <span className="truncate font-medium">{label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{spec.specName}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {spec.status && <StatusBadge status={spec.status} />}
                      {spec.priority && <PriorityBadge priority={spec.priority} />}
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>

          {tagSuggestions.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t('quickSearch.filterHeading')}>
                {tagSuggestions.map((tag) => (
                  <CommandItem key={tag} value={tag} onSelect={() => handleTagSelect(tag)}>
                    <Tag className="mr-2 h-4 w-4" />
                    <span className="font-medium">{tag}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
