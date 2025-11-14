/**
 * Board page - Redirects to unified specs page with board view
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Board() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/specs?view=board');
  }, [router]);

  return null;
}
