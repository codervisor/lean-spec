/**
 * Next.js Middleware for unified routing
 * 
 * Part of spec 151 Phase 3: Route Consolidation
 * 
 * Redirects legacy single-project routes to the unified project-scoped routes:
 * - /specs/* → /projects/default/*  
 * - /dependencies → /projects/default/dependencies
 * - /stats → /projects/default/stats
 * 
 * This enables a unified architecture where all routes are project-scoped,
 * with 'default' being the implicit project for single-project mode.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Legacy routes that should redirect to project-scoped routes
 */
const LEGACY_ROUTE_PATTERNS = [
  { pattern: /^\/specs(?:\/(.*))?$/, target: (match: RegExpMatchArray) => `/projects/default/specs${match[1] ? `/${match[1]}` : ''}` },
  { pattern: /^\/dependencies$/, target: () => '/projects/default/dependencies' },
  { pattern: /^\/stats$/, target: () => '/projects/default/stats' },
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip API routes and static assets
  if (pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check for legacy routes and redirect
  for (const { pattern, target } of LEGACY_ROUTE_PATTERNS) {
    const match = pathname.match(pattern);
    if (match) {
      const targetPath = target(match);
      const url = request.nextUrl.clone();
      url.pathname = targetPath;
      return NextResponse.redirect(url, 308); // Permanent redirect
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match routes that might need redirection
  matcher: [
    '/specs/:path*',
    '/dependencies',
    '/stats',
  ],
};
