import { CompleteSpecRelationships } from '../../types/specs';
export interface DependencyGraphProps {
    relationships: CompleteSpecRelationships;
    specNumber?: number | null;
    specTitle: string;
    onNodeClick?: (specId: string) => void;
    labels?: {
        title?: string;
        subtitle?: string;
        badge?: string;
        currentBadge?: string;
        currentSubtitle?: string;
        dependsOnBadge?: string;
        dependsOnSubtitle?: string;
        requiredByBadge?: string;
        requiredBySubtitle?: string;
        completedSubtitle?: string;
        inProgressSubtitle?: string;
        plannedBlockingSubtitle?: string;
        plannedCanProceedSubtitle?: string;
        archivedSubtitle?: string;
    };
    statusLabels?: Record<string, string>;
    priorityLabels?: Record<string, string>;
}
export declare function SpecDependencyGraph(props: DependencyGraphProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=dependency-graph.d.ts.map