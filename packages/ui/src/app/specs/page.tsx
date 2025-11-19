/**
 * Specs page - Browse all LeanSpec specifications with list/board switcher
 */

import { getSpecsWithMetadata, getStats } from '@/lib/db/service-queries';
import { SpecsClient } from './specs-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function SpecsPage() {
  const [specs, stats] = await Promise.all([
    getSpecsWithMetadata(),
    getStats(),
  ]);

  return <SpecsClient initialSpecs={specs} initialStats={stats} />;
}
