/**
 * Home page - Dashboard with project overview
 */

import { getStats, getSpecs } from '@/lib/db/service-queries';
import { DashboardClient } from './dashboard-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [stats, specs] = await Promise.all([
    getStats(),
    getSpecs(),
  ]);

  return <DashboardClient initialSpecs={specs} initialStats={stats} />;
}
