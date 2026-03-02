import { type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Maximize2,
  Minimize2,
  List as ListIcon,
  Terminal,
  CornerDownRight,
  ChevronRight,
  Link2
} from 'lucide-react';
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  formatDate,
  SpecTimeline,
  StatusBadge,
  PriorityBadge,
} from '@/library';
import { UmbrellaBadge } from '../umbrella-badge';
import { StatusEditor } from '../metadata-editors/status-editor';
import { PriorityEditor } from '../metadata-editors/priority-editor';
import { TagsEditor } from '../metadata-editors/tags-editor';
import { TokenBadge } from '../token-badge';
import { ValidationBadge } from '../validation-badge';
import { PageContainer } from '../shared/page-container';
import type { SpecDetail } from '../../types/api';
import type { ValidationStatus } from '../../types/api';

interface SpecDetailHeaderProps {
  spec: SpecDetail;
  basePath: string;
  displayTitle: string;
  tags: string[];
  updatedRelative: string | null;
  isFocusMode: boolean;
  setIsFocusMode: (v: boolean) => void;
  headerRef: RefObject<HTMLElement | null>;
  machineModeEnabled: boolean;
  isMachineAvailable: () => boolean;
  applySpecPatch: (updates: Partial<SpecDetail>) => void;
  onOpenTimeline: () => void;
  onOpenRelationships: () => void;
  onOpenSessions: () => void;
  onOpenMobile: () => void;
  timelineDialogOpen: boolean;
  setTimelineDialogOpen: (v: boolean) => void;
  activeSessionsCount: number;
  totalSessionsCount: number;
  currentTokenCount: number | undefined;
  currentValidationStatus: ValidationStatus | undefined;
  asyncMetadata: { validationErrors?: number };
  onOpenTokenDialog: () => void;
  onOpenValidationDialog: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  i18n: { language: string };
}

export function SpecDetailHeader({
  spec,
  basePath,
  displayTitle,
  tags,
  updatedRelative,
  isFocusMode,
  setIsFocusMode,
  headerRef,
  machineModeEnabled,
  isMachineAvailable,
  applySpecPatch,
  onOpenTimeline,
  onOpenRelationships,
  onOpenSessions,
  onOpenMobile,
  timelineDialogOpen,
  setTimelineDialogOpen,
  activeSessionsCount,
  totalSessionsCount,
  currentTokenCount,
  currentValidationStatus,
  asyncMetadata,
  onOpenTokenDialog,
  onOpenValidationDialog,
  t,
  i18n,
}: SpecDetailHeaderProps) {
  const showMetadataBadges =
    currentTokenCount !== undefined || currentValidationStatus !== undefined;

  return (
    <header ref={headerRef} className="lg:sticky lg:top-0 lg:z-20 border-b bg-card">
      <PageContainer
        padding="none"
        contentClassName={cn(
          "px-4 sm:px-6 lg:px-8",
          isFocusMode ? "py-1.5" : "py-2 sm:py-3"
        )}
      >
        {/* Focus mode: Single compact row */}
        {isFocusMode ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-base font-semibold tracking-tight truncate">
                {spec.specNumber && (
                  <span className="text-muted-foreground">#{spec.specNumber} </span>
                )}
                {displayTitle}
              </h1>
              <StatusBadge status={spec.status || 'planned'} />
              <PriorityBadge priority={spec.priority || 'medium'} />
              {spec.children && spec.children.length > 0 && (
                <UmbrellaBadge count={spec.children.length} />
              )}
              <TokenBadge
                count={currentTokenCount}
                size="sm"
                onClick={onOpenTokenDialog}
              />
              <ValidationBadge
                status={currentValidationStatus}
                errorCount={asyncMetadata.validationErrors}
                size="sm"
                onClick={onOpenValidationDialog}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFocusMode(false)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
              title={t('specDetail.buttons.exitFocus')}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* Normal mode: Full multi-line header */
          <>
            {/* Breadcrumb Hierarchy */}
            {spec.parent && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Link to={`${basePath}/specs/${spec.parent}`} className="hover:text-primary hover:underline flex items-center gap-1 group">
                  <CornerDownRight className="h-3 w-3 group-hover:text-primary" />
                  <span className="font-medium">{spec.parent}</span>
                </Link>
                <ChevronRight className="h-3 w-3 opacity-50" />
                <span className="truncate opacity-70">{displayTitle}</span>
              </div>
            )}

            {/* Line 1: Spec number + H1 Title */}
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              {spec.children && spec.children.length > 0 && (
                <UmbrellaBadge iconOnly />
              )}
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                {spec.specNumber && (
                  <span className="text-muted-foreground">#{spec.specNumber} </span>
                )}
                {displayTitle}
              </h1>

              {/* Mobile Specs List Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 -mr-2 shrink-0 text-muted-foreground"
                onClick={onOpenMobile}
              >
                <ListIcon className="h-5 w-5" />
                <span className="sr-only">{t('specDetail.toggleSidebar')}</span>
              </Button>
            </div>

            {/* Line 2: Status, Priority, Tokens, Validation, Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusEditor
                specName={spec.specName}
                value={spec.status}
                expectedContentHash={spec.contentHash}
                disabled={machineModeEnabled && !isMachineAvailable()}
                onChange={(status) => applySpecPatch({ status })}
              />
              <PriorityEditor
                specName={spec.specName}
                value={spec.priority}
                expectedContentHash={spec.contentHash}
                disabled={machineModeEnabled && !isMachineAvailable()}
                onChange={(priority) => applySpecPatch({ priority })}
              />

              {showMetadataBadges && <>
                <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

                <div className="flex items-center gap-2">
                  <TokenBadge
                    count={currentTokenCount}
                    size="md"
                    onClick={onOpenTokenDialog}
                  />
                  <ValidationBadge
                    status={currentValidationStatus}
                    errorCount={asyncMetadata.validationErrors}
                    size="md"
                    onClick={onOpenValidationDialog}
                  />
                </div>
              </>}

              <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

              <TagsEditor
                specName={spec.specName}
                value={tags}
                expectedContentHash={spec.contentHash}
                disabled={machineModeEnabled && !isMachineAvailable()}
                onChange={(newTags) => applySpecPatch({ tags: newTags })}
                compact={true}
                className="min-w-0"
              />
            </div>

            {machineModeEnabled && !isMachineAvailable() && (
              <div className="text-xs text-destructive mt-2">
                {t('machines.unavailable')}
              </div>
            )}

            {/* Line 3: Small metadata row */}
            <div className="flex flex-wrap gap-2 sm:gap-4 text-xs text-muted-foreground mt-1.5 sm:mt-2">
              <span className="hidden sm:inline">
                {t('specDetail.metadata.created')}: {formatDate(spec.createdAt, i18n.language)}
              </span>
              <span className="hidden sm:inline">•</span>
              <span>
                {t('specDetail.metadata.updated')}: {formatDate(spec.updatedAt, i18n.language)}
                {updatedRelative && (
                  <span className="ml-1 text-[11px] text-muted-foreground/80">({updatedRelative})</span>
                )}
              </span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden md:inline">{t('specDetail.metadata.name')}: {spec.specName}</span>
              {spec.metadata?.assignee ? (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{t('specDetail.metadata.assignee')}: {String(spec.metadata.assignee)}</span>
                </>
              ) : null}
            </div>

            {/* Action buttons row */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-haspopup="dialog"
                  aria-expanded={timelineDialogOpen}
                  onClick={onOpenTimeline}
                  className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {t('specDetail.buttons.viewTimeline')}
                </Button>
                <DialogContent className="w-[min(900px,90vw)] max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{t('specDetail.dialogs.timelineTitle')}</DialogTitle>
                    <DialogDescription>{t('specDetail.dialogs.timelineDescription')}</DialogDescription>
                  </DialogHeader>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <SpecTimeline
                      createdAt={spec.createdAt}
                      updatedAt={spec.updatedAt}
                      completedAt={spec.completedAt}
                      status={spec.status || 'planned'}
                      labels={{
                        created: t('specTimeline.events.created'),
                        inProgress: t('specTimeline.events.inProgress'),
                        complete: t('specTimeline.events.complete'),
                        archived: t('specTimeline.events.archived'),
                        awaiting: t('specTimeline.state.awaiting'),
                        queued: t('specTimeline.state.queued'),
                        pending: t('specTimeline.state.pending'),
                      }}
                      language={i18n.language}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-haspopup="dialog"
                onClick={onOpenRelationships}
                className={cn(
                  'h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground'
                )}
              >
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
                {t('relationships.button')}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenSessions}
                className="h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Terminal className="mr-1.5 h-3.5 w-3.5" />
                {t('navigation.sessions')}
                <span className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-[10px]",
                  activeSessionsCount > 0 ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                )}>
                  {activeSessionsCount > 0 ? `● ${activeSessionsCount}` : totalSessionsCount}
                </span>
              </Button>

              {/* Focus Mode Toggle */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFocusMode(true)}
                className="hidden lg:inline-flex h-8 rounded-full border px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                title={t('specDetail.buttons.focus')}
              >
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                {t('specDetail.buttons.focus')}
              </Button>
            </div>
          </>
        )}
      </PageContainer>
    </header>
  );
}
