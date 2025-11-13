/**
 * Board page - Kanban view of specs by status
 */

import { getSpecs } from '@/lib/db/queries';
import { BoardClient } from './board-client';

// Force dynamic rendering - this page needs runtime data
export const dynamic = 'force-dynamic';

export default async function Board() {
  const specs = await getSpecs();
  return <BoardClient initialSpecs={specs} />;
}
