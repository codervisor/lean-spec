import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Folder, Check } from 'lucide-react';
import { useProject } from '../contexts';
import { cn } from '../lib/utils';

export function ProjectSwitcher() {
  const { currentProject, availableProjects, loading, switchProject } = useProject();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitch = async (projectId: string) => {
    if (projectId === currentProject?.id || switching) return;
    
    setSwitching(true);
    try {
      await switchProject(projectId);
      setOpen(false);
      // Refresh the page to reload all data with new project
      window.location.reload();
    } catch {
      // Error is handled by context
    } finally {
      setSwitching(false);
    }
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        <Folder className="w-4 h-4" />
        <span>Loading...</span>
      </div>
    );
  }

  const allProjects = availableProjects;
  const hasMultipleProjects = allProjects.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => hasMultipleProjects && setOpen(!open)}
        disabled={!hasMultipleProjects || switching}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors',
          hasMultipleProjects
            ? 'hover:bg-secondary cursor-pointer'
            : 'cursor-default',
          switching && 'opacity-50'
        )}
      >
        <Folder className="w-4 h-4 text-primary" />
        <span className="max-w-[150px] truncate font-medium">
          {currentProject?.name || 'No project'}
        </span>
        {hasMultipleProjects && (
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        )}
      </button>

      {open && hasMultipleProjects && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-background border rounded-md shadow-lg z-50">
          <div className="p-2 border-b">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              Switch Project
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {allProjects.map((project) => {
              const isCurrent = project.id === currentProject?.id;
              return (
                <button
                  key={project.id}
                  onClick={() => handleSwitch(project.id)}
                  disabled={isCurrent || switching}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary transition-colors',
                    isCurrent && 'bg-secondary/50'
                  )}
                >
                  <Folder className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{project.path}</div>
                  </div>
                  {isCurrent && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
