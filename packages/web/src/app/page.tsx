/**
 * Home page - Dashboard with project overview
 */

import { getProjects, getStats, getSpecs } from '@/lib/db/queries';
import { DashboardClient } from './dashboard-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [projects, stats, specs] = await Promise.all([
    getProjects(),
    getStats(),
    getSpecs(),
  ]);

  return <DashboardClient initialSpecs={specs} initialStats={stats} />;
}
