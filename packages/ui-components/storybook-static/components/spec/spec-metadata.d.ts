/**
 * SpecMetadata component
 * Displays spec metadata in a card format with icons
 */
export interface SpecMetadataData {
    status?: string | null;
    priority?: string | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
    completedAt?: string | Date | null;
    assignee?: string | null;
    tags?: string[] | null;
    githubUrl?: string | null;
}
export interface SpecMetadataProps {
    /** Spec data to display */
    spec: SpecMetadataData;
    /** Additional CSS classes */
    className?: string;
    /** Locale for date formatting */
    locale?: string;
    /** Labels for the metadata fields */
    labels?: {
        status?: string;
        priority?: string;
        created?: string;
        updated?: string;
        completed?: string;
        assignee?: string;
        tags?: string;
        source?: string;
        viewOnGitHub?: string;
    };
}
export declare function SpecMetadata({ spec, className, locale, labels }: SpecMetadataProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=spec-metadata.d.ts.map