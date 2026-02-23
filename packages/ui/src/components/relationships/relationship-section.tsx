import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge, Button, cn } from '@/library';

interface RelationshipItem {
  specName: string;
  title?: string | null;
  specNumber?: number | null;
}

interface RelationshipSectionProps {
  title: string;
  items: RelationshipItem[];
  emptyLabel: string;
  canEdit?: boolean;
  onNavigate: (specName: string) => void;
  onRemove?: (specName: string) => void;
  actions?: ReactNode;
}

const formatSpecNumber = (specNumber?: number | null) =>
  specNumber != null ? specNumber.toString().padStart(3, '0') : null;

export function RelationshipSection({
  title,
  items,
  emptyLabel,
  canEdit,
  onNavigate,
  onRemove,
  actions,
}: RelationshipSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h4>
        {actions}
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">{emptyLabel}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const specNumber = formatSpecNumber(item.specNumber ?? null);
            const label = item.title || item.specName;
            return (
              <Badge
                key={item.specName}
                variant="secondary"
                className={cn('flex items-center gap-2 px-2 py-1 text-xs')}
              >
                <button
                  type="button"
                  onClick={() => onNavigate(item.specName)}
                  className="flex items-center gap-1 text-left hover:text-primary"
                >
                  {specNumber && (
                    <span className="font-mono text-[10px] text-muted-foreground">#{specNumber}</span>
                  )}
                  <span className="max-w-[160px] truncate">{label}</span>
                </button>
                {canEdit && onRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0"
                    onClick={() => onRemove(item.specName)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
