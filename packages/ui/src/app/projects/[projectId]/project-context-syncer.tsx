'use client';

import { useEffect } from 'react';
import { useProject, isDefaultProject } from '@/contexts/project-context';

export function ProjectContextSyncer({ projectId }: { projectId: string }) {
  const { mode, switchProject, currentProject } = useProject();

  useEffect(() => {
    // In single-project mode with 'default' projectId, no need to switch
    if (mode === 'single-project' && isDefaultProject(projectId)) {
      return;
    }
    
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      switchProject(projectId).catch(console.error);
    }
  }, [projectId, mode, currentProject, switchProject]);

  return null;
}
