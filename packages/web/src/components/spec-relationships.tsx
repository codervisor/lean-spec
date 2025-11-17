'use client';

import Link from 'next/link';
import { GitBranch, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecRelationships } from '@/types/specs';
import type { CSSProperties } from 'react';

interface SpecRelationshipsProps {
  relationships?: SpecRelationships;
  specNumber?: number | null;
  specTitle: string;
}

const VIEWBOX_WIDTH = 1000;
const COLUMN_X = {
  left: 200,
  center: 500,
  right: 800,
};
const NODE_WIDTH = 200;
const NODE_HEIGHT = 70;
const MIN_HEIGHT = 260;
const TOP_PADDING = 60;

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

function getLanePositions(count: number, height: number) {
  if (count <= 0) return [];
  if (count === 1) {
    return [height / 2];
  }
  const usable = Math.max(height - TOP_PADDING * 2, NODE_HEIGHT);
  return Array.from({ length: count }, (_, index) => (
    TOP_PADDING + (usable * index) / (count - 1)
  ));
}

interface DagNodeProps {
  href: string;
  label: string;
  badge: string;
  xPercent: number;
  yPercent: number;
  tone: 'precedence' | 'related' | 'current';
  subtitle?: string;
}

function DagNode({ href, label, badge, xPercent, yPercent, tone, subtitle }: DagNodeProps) {
  const baseClasses = cn(
    'absolute flex flex-col gap-1 rounded-xl border px-4 py-3 text-xs shadow-sm transition-colors',
    tone === 'current' && 'border-primary/70 bg-primary/5 text-foreground',
    tone === 'precedence' && 'border-amber-400/70 bg-amber-400/10 text-amber-900 dark:text-amber-200',
    tone === 'related' && 'border-sky-400/70 bg-sky-400/10 text-sky-900 dark:text-sky-200'
  );

  const style: CSSProperties = {
    left: `calc(${xPercent}% - ${NODE_WIDTH / 2}px)`,
    top: `calc(${yPercent}% - ${NODE_HEIGHT / 2}px)`
  };

  const content = (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
        {badge}
      </span>
      <span className="font-semibold text-sm leading-snug">
        {label}
      </span>
      {subtitle && (
        <span className="text-[11px] text-muted-foreground/80">{subtitle}</span>
      )}
    </div>
  );

  if (tone === 'current') {
    return (
      <div className={baseClasses} style={style}>
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={cn(baseClasses, 'hover:border-primary/80 hover:text-foreground')} style={style}>
      {content}
    </Link>
  );
}

export function SpecRelationships({ relationships, specNumber, specTitle }: SpecRelationshipsProps) {
  if (!relationships) {
    return null;
  }

  const { dependsOn = [], related = [] } = relationships;
  if (dependsOn.length === 0 && related.length === 0) {
    return null;
  }

  const laneCount = Math.max(dependsOn.length, related.length, 1);
  const height = Math.max(MIN_HEIGHT, TOP_PADDING * 2 + (laneCount - 1) * 110);
  const centerY = height / 2;
  const precedencePositions = getLanePositions(dependsOn.length, height);
  const relatedPositions = getLanePositions(related.length, height);

  const precedenceNodes = dependsOn.map((item, index) => {
    const y = precedencePositions[index];
    return {
      label: formatRelationshipLabel(item),
      href: buildRelationshipHref(item),
      y,
      yPercent: (y / height) * 100,
    };
  });

  const relatedNodes = related.map((item, index) => {
    const y = relatedPositions[index];
    return {
      label: formatRelationshipLabel(item),
      href: buildRelationshipHref(item),
      y,
      yPercent: (y / height) * 100,
    };
  });

  const centerLabel = specNumber
    ? `#${specNumber.toString().padStart(3, '0')} ${specTitle}`
    : specTitle;

  return (
    <section className="rounded-xl border border-border bg-muted/30 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">Dependency Map</p>
          <h3 className="text-base font-semibold text-foreground">Precedence & Connected Work</h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
          <GitBranch className="h-3.5 w-3.5" />
          <span>DAG View</span>
        </div>
      </div>

      <div className="relative mt-5" style={{ minHeight: height }}>
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
          preserveAspectRatio="none"
        >
          {precedenceNodes.map((node, index) => (
            <path
              key={`precedence-line-${index}`}
              d={`M ${COLUMN_X.left + NODE_WIDTH / 2} ${node.y} C ${(COLUMN_X.left + COLUMN_X.center) / 2} ${node.y}, ${(COLUMN_X.left + COLUMN_X.center) / 2} ${centerY}, ${COLUMN_X.center - NODE_WIDTH / 2} ${centerY}`}
              fill="none"
              stroke="rgba(251, 191, 36, 0.85)"
              strokeWidth={2.5}
              strokeLinecap="round"
              markerEnd="url(#precedence-arrow)"
            />
          ))}

          {relatedNodes.map((node, index) => (
            <path
              key={`related-line-${index}`}
              d={`M ${COLUMN_X.center + NODE_WIDTH / 2} ${centerY} C ${(COLUMN_X.center + COLUMN_X.right) / 2} ${centerY}, ${(COLUMN_X.center + COLUMN_X.right) / 2} ${node.y}, ${COLUMN_X.right - NODE_WIDTH / 2} ${node.y}`}
              fill="none"
              stroke="rgba(56, 189, 248, 0.7)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="6 6"
            />
          ))}

          {precedenceNodes.length > 0 && (
            <text
              x={COLUMN_X.left}
              y={30}
              textAnchor="middle"
              className="fill-current"
              fontSize="11"
              fontWeight={600}
            >
              Precedence
            </text>
          )}

          {relatedNodes.length > 0 && (
            <text
              x={COLUMN_X.right}
              y={30}
              textAnchor="middle"
              className="fill-current"
              fontSize="11"
              fontWeight={600}
            >
              Connected Work
            </text>
          )}

          <text
            x={COLUMN_X.center}
            y={30}
            textAnchor="middle"
            fontSize="11"
            fontWeight={600}
          >
            Current Spec
          </text>

          <defs>
            <marker id="precedence-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L0,7 L7,3.5 z" fill="rgba(251, 191, 36, 0.85)" />
            </marker>
          </defs>
        </svg>

        <div className="relative">
          {precedenceNodes.map((node, index) => (
            <DagNode
              key={`precedence-node-${index}`}
              href={node.href}
              label={node.label}
              badge="Precedence"
              tone="precedence"
              xPercent={(COLUMN_X.left / VIEWBOX_WIDTH) * 100}
              yPercent={node.yPercent}
            />
          ))}

          <DagNode
            href="#"
            label={centerLabel}
            badge="Current"
            tone="current"
            xPercent={(COLUMN_X.center / VIEWBOX_WIDTH) * 100}
            yPercent={(centerY / height) * 100}
            subtitle="This spec"
          />

          {relatedNodes.map((node, index) => (
            <DagNode
              key={`related-node-${index}`}
              href={node.href}
              label={node.label}
              badge="Connected"
              tone="related"
              xPercent={(COLUMN_X.right / VIEWBOX_WIDTH) * 100}
              yPercent={node.yPercent}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <div className="inline-flex items-center gap-1 font-medium">
          <span className="inline-block h-2 w-6 rounded-full bg-amber-400/80" />
          Precedence indicates blockers that must finish first.
        </div>
        <div className="inline-flex items-center gap-1 font-medium">
          <span className="inline-block h-2 w-6 rounded-full bg-sky-400/80" />
          Connected work shows parallel or follow-up specs.
        </div>
        <div className="inline-flex items-center gap-1 text-muted-foreground/80">
          <ArrowRight className="h-3 w-3" />
          Click any node to jump to its detail page.
        </div>
      </div>
    </section>
  );
}
