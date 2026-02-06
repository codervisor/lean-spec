import { Link, useLocation } from 'react-router-dom';
import { cn } from '@leanspec/ui-components';
import type { LucideIcon } from 'lucide-react';

export interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  description?: string;
  isCollapsed?: boolean;
  /** 
   * Enable project prefix stripping for active state detection.
   * When true, strips /projects/:id prefix for route matching.
   */
  stripProjectPrefix?: boolean;
}

export function SidebarLink({
  to,
  icon: Icon,
  label,
  description,
  isCollapsed = false,
  stripProjectPrefix = false,
}: SidebarLinkProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const normalize = (value: string) => value.replace(/\/$/, '') || '/';
  const normalizedTo = normalize(to);
  const normalizedPath = normalize(currentPath);

  // Strip /projects/:id prefix so highlighting works for project-scoped routes
  const stripPrefix = (value: string) => {
    if (!stripProjectPrefix) return value;
    const match = value.match(/^\/projects\/[^/]+(\/.*)?$/);
    return match ? (match[1] || '/') : value;
  };

  const toWithoutPrefix = stripPrefix(normalizedTo);
  const pathWithoutPrefix = stripPrefix(normalizedPath);

  const isHome = toWithoutPrefix === '/' || toWithoutPrefix === '';
  const isActive = isHome
    ? pathWithoutPrefix === '/' || pathWithoutPrefix === ''
    : pathWithoutPrefix === toWithoutPrefix || pathWithoutPrefix.startsWith(`${toWithoutPrefix}/`);

  return (
    <Link
      to={to}
      title={isCollapsed ? label : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground font-medium',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
      {!isCollapsed && (
        <div className="flex flex-col">
          <span className="text-sm">{label}</span>
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
    </Link>
  );
}
