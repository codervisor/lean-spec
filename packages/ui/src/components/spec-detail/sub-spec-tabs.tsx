import { Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageContainer } from '../shared/page-container';
import type { SubSpec } from '../../types/api';

export interface EnrichedSubSpec extends SubSpec {
  icon: LucideIcon;
  color: string;
}

interface SubSpecTabsProps {
  subSpecs: EnrichedSubSpec[];
  currentSubSpec: string | null;
  onSwitch: (file: string | null) => void;
  t: (key: string) => string;
}

export function SubSpecTabs({ subSpecs, currentSubSpec, onSwitch, t }: SubSpecTabsProps) {
  if (subSpecs.length === 0) return null;

  return (
    <div className="border-t bg-muted/30">
      <PageContainer padding="none" contentClassName="px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {/* Overview tab (README.md) */}
          <button
            onClick={() => onSwitch(null)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${!currentSubSpec
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">{t('specDetail.tabs.overview')}</span>
          </button>

          {/* Sub-spec tabs */}
          {subSpecs.map((subSpec) => {
            const Icon = subSpec.icon;
            return (
              <button
                key={subSpec.file}
                onClick={() => onSwitch(subSpec.file ?? null)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${currentSubSpec === subSpec.file
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Icon className={`h-4 w-4 ${subSpec.color}`} />
                <span className="hidden sm:inline">{subSpec.name}</span>
              </button>
            );
          })}
        </div>
      </PageContainer>
    </div>
  );
}
