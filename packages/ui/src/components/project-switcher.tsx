/**
 * Project Switcher Component
 * Dropdown/expandable project selector for the sidebar
 */

'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus, FolderOpen, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useProject } from '@/contexts/project-context';
import { CreateProjectDialog } from '@/components/create-project-dialog';

interface ProjectSwitcherProps {
  collapsed?: boolean;
  onAddProject?: () => void; // Kept for compatibility, but we'll use internal dialog
}

export function ProjectSwitcher({ collapsed }: ProjectSwitcherProps) {
  const {
    currentProject,
    projects,
    switchProject,
  } = useProject();
  
  const [open, setOpen] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  const handleProjectSelect = async (projectId: string) => {
    await switchProject(projectId);
    setOpen(false);
  };

  const sortedProjects = [...projects].sort((a, b) => {
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
            className={cn(
              "w-full justify-between",
              collapsed ? "h-9 w-9 p-0 justify-center" : "px-3"
            )}
          >
            {collapsed ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <>
                <div className="flex items-center gap-2 truncate">
                  <FolderOpen className="h-4 w-4 shrink-0 opacity-50" />
                  <span className="truncate">
                    {currentProject?.name || "Select project..."}
                  </span>
                </div>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search projects..." />
            <CommandList>
              <CommandEmpty>No project found.</CommandEmpty>
              <CommandGroup heading="Projects">
                {sortedProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => handleProjectSelect(project.id)}
                    className="text-sm"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentProject?.id === project.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate flex-1">{project.name}</span>
                      {project.favorite && (
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                  </CommandItem>
                ))}
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
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
