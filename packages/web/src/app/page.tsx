/**
 * Home page - Browse LeanSpec specifications
 */

import { getProjects, getStats, getSpecs } from '@/lib/db/queries';
import { HomeClient } from './home-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [projects, stats, specs] = await Promise.all([
    getProjects(),
    getStats(),
    getSpecs(),
  ]);

  return <HomeClient initialProjects={projects} initialStats={stats} initialSpecs={specs} />;
}
