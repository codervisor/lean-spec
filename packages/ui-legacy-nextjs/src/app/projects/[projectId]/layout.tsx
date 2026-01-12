import { ProjectContextSyncer } from './project-context-syncer';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <>
      <ProjectContextSyncer projectId={projectId} />
      {children}
    </>
  );
}
