'use client';

import { useState } from 'react';
import { Plus, Search, FolderOpen, Star, MoreVertical, Trash2 } from 'lucide-react';
import { useProject } from '@/contexts/project-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function ProjectsPage() {
  const { projects, switchProject, toggleFavorite, removeProject } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = async (projectId: string) => {
    await switchProject(projectId);
    // Optionally navigate to dashboard, but switchProject might handle it or we stay here
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Manage your LeanSpec projects and workspaces.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="group relative hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: project.color || '#666' }}
                  >
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-base leading-none">
                      <button
                        onClick={() => handleProjectClick(project.id)}
                        className="hover:underline focus:outline-none"
                      >
                        {project.name}
                      </button>
                    </CardTitle>
                    <CardDescription className="text-xs truncate max-w-[150px]">
                      {project.path}
                    </CardDescription>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleFavorite(project.id)}>
                      <Star className="mr-2 h-4 w-4" />
                      {project.favorite ? 'Unfavorite' : 'Favorite'}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => removeProject(project.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <FolderOpen className="mr-1 h-3 w-3" />
                  <span className="text-xs">Local</span>
                </div>
                {project.lastAccessed && (
                  <span className="text-xs">
                    Opened {dayjs(project.lastAccessed).fromNow()}
                  </span>
                )}
              </div>
            </CardContent>
            {project.favorite && (
              <div className="absolute top-2 right-10 text-yellow-500">
                <Star className="h-4 w-4 fill-current" />
              </div>
            )}
          </Card>
        ))}
        
        {filteredProjects.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {searchQuery ? "Try adjusting your search query." : "Get started by adding your first project."}
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>
        )}
      </div>

      <CreateProjectDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
}
