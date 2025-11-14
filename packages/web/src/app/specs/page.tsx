/**
 * Specs page - Browse all LeanSpec specifications with list/board switcher
 */

import { getSpecs, getStats } from '@/lib/db/queries';
import { SpecsClient } from './specs-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function SpecsPage() {
  const [specs, stats] = await Promise.all([
    getSpecs(),
    getStats(),
  ]);

  return <SpecsClient initialSpecs={specs} initialStats={stats} />;
}
