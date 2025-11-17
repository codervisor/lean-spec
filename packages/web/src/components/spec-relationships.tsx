'use client';

import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecRelationships } from '@/types/specs';

interface SpecRelationshipsProps {
  relationships?: SpecRelationships;
}

const GROUP_LABELS: Record<keyof SpecRelationships, string> = {
  dependsOn: 'Depends On',
  related: 'Related Specs',
};

function formatRelationshipLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 'Unknown Spec';
  const match = trimmed.match(/^(\d+)[-_]?(.*)$/);
  if (!match) {
    return trimmed;
  }
  const number = match[1].padStart(3, '0');
  const remainder = match[2]?.replace(/[-_]/g, ' ').trim();
  return remainder ? `#${number} ${remainder}` : `#${number}`;
}

function buildRelationshipHref(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)/);
  if (match) {
    return `/specs/${parseInt(match[1], 10)}`;
  }
  return `/specs/${trimmed}`;
}

function RelationshipGroup({ label, items }: { label: string; items: string[] }) {
  if (!items.length) {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground/70">None recorded</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={`${label}-${item}`}
            href={buildRelationshipHref(item)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors',
              'hover:border-primary hover:text-foreground'
            )}
          >
            <Link2 className="h-3.5 w-3.5" />
            <span>{formatRelationshipLabel(item)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SpecRelationships({ relationships }: SpecRelationshipsProps) {
  if (!relationships) {
    return null;
  }

  const { dependsOn = [], related = [] } = relationships;
  if (dependsOn.length === 0 && related.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Relationships</h3>
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Dependencies</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <RelationshipGroup label={GROUP_LABELS.dependsOn} items={dependsOn} />
        <RelationshipGroup label={GROUP_LABELS.related} items={related} />
      </div>
    </section>
  );
}
