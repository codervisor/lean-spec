import { useState } from 'react';
import { ChevronsUpDown, Plus, Star, Settings, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Skeleton } from '../ui/skeleton';
import { ProjectAvatar } from './project-avatar';

export interface Project {
  id: string;
  name: string;
  path?: string;
  color?: string;
  favorite?: boolean;
}

export interface ProjectSwitcherProps {
  currentProject?: Project | null;
  projects: Project[];
  isLoading?: boolean;
  collapsed?: boolean;
  isSwitching?: boolean;
  onProjectSelect?: (projectId: string) => void;
  onAddProject?: () => void;
  onManageProjects?: () => void;
  labels?: {
    switching?: string;
    placeholder?: string;
    searchPlaceholder?: string;
    noProject?: string;
    projects?: string;
    createProject?: string;
    manageProjects?: string;
  };
}

export function ProjectSwitcher({
  currentProject,
  projects,
  isLoading = false,
  collapsed = false,
  isSwitching = false,
  onProjectSelect,
  onAddProject,
  onManageProjects,
  labels,
}: ProjectSwitcherProps) {
  const [open, setOpen] = useState(false);

  if (isLoading) {
    return (
      <Skeleton className={cn(
        "w-full",
        collapsed ? "h-9 w-9" : "h-10"
      )} />
    );
  }

  const handleProjectSelect = (projectId: string) => {
    if (projectId === currentProject?.id) {
      setOpen(false);
      return;
    }
    
    setOpen(false);
    onProjectSelect?.(projectId);
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.favorite === b.favorite) return 0;
    return a.favorite ? -1 : 1;
  });

  return (
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
                  {isSwitching 
                    ? (labels?.switching || 'Switching...') 
                    : (currentProject?.name || labels?.placeholder || 'Select project')}
                </span>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={labels?.searchPlaceholder || 'Search projects...'} />
          <CommandList>
            <CommandEmpty>{labels?.noProject || 'No projects found'}</CommandEmpty>
            <CommandGroup heading={labels?.projects || 'Projects'}>
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
                        name={project.name}
                        color={project.color}
                        size="sm"
                        className="shrink-0"
                      />
                      <span className="truncate flex-1">{project.name}</span>
                      {project.favorite && (
                        <Star className="h-3 w-3 shrink-0 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {(onAddProject || onManageProjects) && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  {onAddProject && (
                    <CommandItem
                      className="cursor-pointer"
                      onSelect={() => {
                        setOpen(false);
                        onAddProject();
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {labels?.createProject || 'Create Project'}
                    </CommandItem>
                  )}
                  {onManageProjects && (
                    <CommandItem
                      className="cursor-pointer"
                      onSelect={() => {
                        setOpen(false);
                        onManageProjects();
                      }}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {labels?.manageProjects || 'Manage Projects'}
                    </CommandItem>
                  )}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
