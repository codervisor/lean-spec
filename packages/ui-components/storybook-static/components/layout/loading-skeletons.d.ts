/**
 * Loading skeleton components for various UI states
 */
/**
 * Skeleton for spec list loading state
 */
export declare function SpecListSkeleton(): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton for spec detail loading state
 */
export declare function SpecDetailSkeleton(): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton for stats card loading state
 */
export declare function StatsCardSkeleton(): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton for kanban board loading state
 */
export declare function KanbanBoardSkeleton(): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton for project card loading state
 */
export declare function ProjectCardSkeleton(): import("react/jsx-runtime").JSX.Element;
/**
 * Skeleton for sidebar loading state
 */
export declare function SidebarSkeleton(): import("react/jsx-runtime").JSX.Element;
/**
 * Generic content skeleton with configurable lines
 */
export interface ContentSkeletonProps {
    /** Number of lines to display */
    lines?: number;
    /** Additional CSS classes */
    className?: string;
}
export declare function ContentSkeleton({ lines, className }: ContentSkeletonProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=loading-skeletons.d.ts.map