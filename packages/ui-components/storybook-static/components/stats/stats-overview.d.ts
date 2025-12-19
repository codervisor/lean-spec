/**
 * StatsOverview component
 * Displays an overview of project stats with multiple stat cards
 */
export interface StatsData {
    totalSpecs: number;
    completedSpecs: number;
    inProgressSpecs: number;
    plannedSpecs: number;
    archivedSpecs?: number;
    completionRate: number;
}
export interface StatsOverviewProps {
    /** Stats data to display */
    stats: StatsData;
    /** Show archived specs card */
    showArchived?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Labels for localization */
    labels?: {
        total?: string;
        totalSubtitle?: string;
        completed?: string;
        completedSubtitle?: string;
        inProgress?: string;
        inProgressSubtitle?: string;
        planned?: string;
        plannedSubtitle?: string;
        archived?: string;
        archivedSubtitle?: string;
        completionRate?: string;
    };
}
export declare function StatsOverview({ stats, showArchived, className, labels, }: StatsOverviewProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=stats-overview.d.ts.map