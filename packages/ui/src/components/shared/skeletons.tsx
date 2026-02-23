/**
 * Re-export all skeleton components from the shared UI library
 *
 * This file serves as a convenience re-export for the UI package.
 * All skeleton implementations are centralized in the UI library
 * to ensure consistent loading states across the application.
 */
export {
  // Page-level skeletons
  ProjectsSkeleton,
  MachinesSkeleton,
  ChatSkeleton,
  DependenciesSkeleton,
  DashboardSkeleton,
  StatsSkeleton,
  ContextPageSkeleton,
  SettingsSkeleton,
  // Component-level skeletons
  SpecListSkeleton,
  SpecDetailSkeleton,
  StatsCardSkeleton,
  KanbanBoardSkeleton,
  ProjectCardSkeleton,
  SidebarSkeleton,
  SpecsNavSidebarSkeleton,
  // Generic/utility skeletons
  ContentSkeleton,
  type ContentSkeletonProps,
} from '@/library';
