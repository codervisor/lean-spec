/**
 * Stats page with detailed metrics and charts
 */

import { getStats, getSpecs } from '@/lib/db/service-queries';
import { StatsClient } from './stats-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const [stats, specs] = await Promise.all([
    getStats(),
    getSpecs(),
  ]);

  return <StatsClient stats={stats} specs={specs} />;
}
