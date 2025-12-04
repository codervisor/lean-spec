/**
 * Project Context Page
 * Displays project-level context files for AI agents and development workflows
 * Spec 131 - UI Project Context Visibility
 */

import { getProjectContext } from '@/lib/db/service-queries';
import { ContextClient } from '@/app/context/context-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function ProjectContextPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // Note: getProjectContext is filesystem-based and doesn't use projectId yet
  // In multi-project mode, it reads from the current project's filesystem
  const context = await getProjectContext();

  return <ContextClient context={context} />;
}
