/**
 * Board page - Kanban view of specs by status
 */

import { getSpecs } from '@/lib/db/queries';
import { BoardClient } from './board-client';

export default async function Board() {
  const specs = await getSpecs();
  return <BoardClient initialSpecs={specs} />;
}
