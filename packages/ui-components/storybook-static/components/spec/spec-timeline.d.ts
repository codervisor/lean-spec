/**
 * Timeline component to visualize spec evolution (vertical layout)
 */
export interface SpecTimelineProps {
    createdAt: Date | string | number | null | undefined;
    updatedAt: Date | string | number | null | undefined;
    completedAt?: Date | string | number | null | undefined;
    status: string;
    className?: string;
    labels?: {
        created?: string;
        inProgress?: string;
        complete?: string;
        archived?: string;
        awaiting?: string;
        queued?: string;
        pending?: string;
    };
    language?: string;
}
export declare function SpecTimeline({ createdAt, updatedAt, completedAt, status, className, labels, language, }: SpecTimelineProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=spec-timeline.d.ts.map