'use client';

import { useEffect } from 'react';
import { useProject } from '@/contexts/project-context';

export function ProjectContextSyncer({ projectId }: { projectId: string }) {
  const { switchProject, currentProject } = useProject();

  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      switchProject(projectId).catch(console.error);
    }
  }, [projectId, currentProject, switchProject]);

  return null;
}
