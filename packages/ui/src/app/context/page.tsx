/**
 * Project Context Page
 * Displays project-level context files for AI agents and development workflows
 * Spec 131 - UI Project Context Visibility
 */

import { getProjectContext } from '@/lib/db/service-queries';
import { ContextClient } from './context-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function ContextPage() {
  const context = await getProjectContext();

  return <ContextClient context={context} />;
}
