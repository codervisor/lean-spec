/**
 * Board page - Redirects to unified specs page with board view
 */

import { redirect } from 'next/navigation';

export default function Board() {
  redirect('/specs?view=board');
}
