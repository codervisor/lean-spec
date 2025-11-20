/**
 * Project Switcher Component
 * Dropdown/expandable project selector for the sidebar
 */

'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Star, FolderOpen, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/project-context';
import type { LocalProject } from '@/lib/projects/types';

interface ProjectSwitcherProps {
  collapsed?: boolean;
  onAddProject?: () => void;
}

export function ProjectSwitcher({ collapsed, onAddProject }: ProjectSwitcherProps) {
  const {
    currentProject,
    recentProjects,
    favoriteProjects,
    projects,
    switchProject,
    toggleFavorite,
  } = useProject();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = async (projectId: string) => {
    await switchProject(projectId);
    setIsExpanded(false);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await toggleFavorite(projectId);
  };

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-center px-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <FolderOpen className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="border-b border-border">
      {/* Current Project Header */}
      <Button
        variant="ghost"
        className="w-full justify-between px-3 py-4 h-auto hover:bg-accent"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen className="h-4 w-4 shrink-0" />
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-medium truncate w-full">
              {currentProject?.name || 'Select Project'}
            </span>
            <span className="text-xs text-muted-foreground">
              {isExpanded ? 'Hide projects' : 'Switch project'}
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </Button>

      {/* Expanded Project List */}
      {isExpanded && (
        <div className="px-2 pb-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>

          {/* Favorites */}
          {favoriteProjects.length > 0 && !searchQuery && (
            <div>
              <div className="px-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  ⭐ FAVORITES
                </span>
              </div>
              <div className="space-y-0.5">
                {favoriteProjects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isCurrent={currentProject?.id === project.id}
                    onSelect={handleProjectClick}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent Projects */}
          {recentProjects.length > 0 && !searchQuery && (
            <div>
              <div className="px-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  📌 RECENT
                </span>
              </div>
              <div className="space-y-0.5">
                {recentProjects
                  .filter((p) => !favoriteProjects.find((f) => f.id === p.id))
                  .map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isCurrent={currentProject?.id === project.id}
                      onSelect={handleProjectClick}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
              </div>
            </div>
          )}

          {/* All Projects / Search Results */}
          {(searchQuery || projects.length > 5) && (
            <div>
              <div className="px-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {searchQuery ? 'SEARCH RESULTS' : `📂 ALL PROJECTS (${projects.length})`}
                </span>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {filteredProjects.map((project) => (
                  <ProjectItem
                    key={project.id}
                    project={project}
                    isCurrent={currentProject?.id === project.id}
                    onSelect={handleProjectClick}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
                {filteredProjects.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                    No projects found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add Project Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onAddProject}
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
        </div>
      )}
    </div>
  );
}

interface ProjectItemProps {
  project: LocalProject;
  isCurrent: boolean;
  onSelect: (projectId: string) => void;
  onToggleFavorite: (e: React.MouseEvent, projectId: string) => void;
}

function ProjectItem({ project, isCurrent, onSelect, onToggleFavorite }: ProjectItemProps) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isCurrent && 'bg-accent text-accent-foreground font-medium'
      )}
      onClick={() => onSelect(project.id)}
    >
      {/* Color indicator */}
      {project.color && (
        <div
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: project.color }}
        />
      )}
      
      {/* Project name */}
      <span className="flex-1 text-left truncate">{project.name}</span>
      
      {/* Favorite star */}
      <button
        className={cn(
          'p-0.5 rounded hover:bg-background/80 transition-colors',
          project.favorite ? 'text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'
        )}
        onClick={(e) => onToggleFavorite(e, project.id)}
      >
        <Star className={cn('h-3.5 w-3.5', project.favorite && 'fill-current')} />
      </button>
    </button>
  );
}
