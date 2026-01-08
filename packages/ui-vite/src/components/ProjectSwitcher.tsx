/**
 * Project Switcher Component
 * Dropdown/expandable project selector for the sidebar
 */

import { useState } from 'react';
import { ChevronsUpDown, Plus, Star, Settings, Loader2, Check } from 'lucide-react';
import { cn } from '@leanspec/ui-components';
import { Button } from '@leanspec/ui-components';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@leanspec/ui-components';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@leanspec/ui-components';
import { Skeleton } from '@leanspec/ui-components';
import { useProject } from '../contexts';
import { CreateProjectDialog } from './projects/CreateProjectDialog';
import { ProjectAvatar } from './shared/ProjectAvatar';
import { useTranslation } from 'react-i18next';

interface ProjectSwitcherProps {
  collapsed?: boolean;
  onAddProject?: () => void; // Kept for compatibility, but we'll use internal dialog
}

export function ProjectSwitcher({ collapsed }: ProjectSwitcherProps) {
  const {
    currentProject,
    projects,
    loading: isLoading,
    switchProject,
  } = useProject();
  const { t } = useTranslation('common');

  const [open, setOpen] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <Skeleton className={cn(
        "w-full",
        collapsed ? "h-9 w-9" : "h-10"
      )} />
    );
  }

  const handleProjectSelect = async (projectId: string) => {
    if (projectId === currentProject?.id) {
      setOpen(false);
      return;
    }

    setIsSwitching(true);
    setOpen(false);

    const pathname = window.location.pathname;
    const projectPathMatch = pathname.match(/^\/projects\/[^/]+(\/.*)?$/);
    let subPath = projectPathMatch?.[1] || '';

    if (subPath.match(/^\/specs\/[^/]+$/)) {
      subPath = '/specs';
    }

    try {
      await switchProject(projectId);
      window.location.assign(`/projects/${projectId}${subPath}`);
    } catch (err) {
      console.error('Failed to switch project', err);
      setIsSwitching(false);
    }
  };

  const sortedProjects = [...(projects || [])].sort((a, b) => {
    if (a.favorite === b.favorite) return 0;
    return a.favorite ? -1 : 1;
  });

  return (
    <>
      <CreateProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={isSwitching}
            className={cn(
              "w-full justify-between transition-opacity",
              collapsed ? "h-9 w-9 p-0 justify-center" : "px-3",
              isSwitching && "opacity-70"
            )}
          >
            {collapsed ? (
              isSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ProjectAvatar
                  name={currentProject?.name || ''}
                  color={currentProject?.color}
                  size="sm"
                />
              )
            ) : (
              <>
                <div className="flex items-center gap-2 truncate">
                  {isSwitching ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : (
                    <ProjectAvatar
                      name={currentProject?.name || ''}
                      color={currentProject?.color}
                      size="sm"
                      className="shrink-0"
                    />
                  )}
                  <span className="truncate">
                    {isSwitching ? t('projectSwitcher.switching') : (currentProject?.name || t('projectSwitcher.placeholder'))}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t('projectSwitcher.searchPlaceholder')} />
            <CommandList>
              <CommandEmpty>{t('projectSwitcher.noProject')}</CommandEmpty>
              <CommandGroup heading={t('projects.projects')}>
                {sortedProjects.map((project) => {
                  const isActive = currentProject?.id === project.id;
                  return (
                    <CommandItem
                      key={project.id}
                      onSelect={() => handleProjectSelect(project.id)}
                      className={cn(
                        "text-sm",
                        isActive && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <ProjectAvatar
                          name={project.name || ''}
                          color={project.color}
                          size="sm"
                          className="shrink-0"
                        />
                        <span className="truncate flex-1">{project.name}</span>
                        {project.favorite && (
                          <Star className="h-3 w-3 shrink-0 fill-yellow-600 text-yellow-600 dark:fill-yellow-500 dark:text-yellow-500" />
                        )}
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center',
                            currentProject?.id === project.id ? 'opacity-100' : 'opacity-0'
                          )}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  className="cursor-pointer"
                  onSelect={() => {
                    setOpen(false);
                    setShowNewProjectDialog(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>{t('projects.createProject')}</span>
                  </div>
                </CommandItem>
                <CommandItem
                  className="cursor-pointer"
                  onSelect={() => {
                    setOpen(false);
                    window.location.assign('/projects');
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>{t('projects.manageProjects')}</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
