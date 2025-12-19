/**
 * ProjectCard component
 * Displays a project card with avatar, name, description, and stats
 */
export interface ProjectCardData {
    id: string;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
    favorite?: boolean;
    specsCount?: number;
    updatedAt?: string | Date | null;
    tags?: string[];
}
export interface ProjectCardProps {
    /** Project data to display */
    project: ProjectCardData;
    /** Click handler for the card */
    onClick?: () => void;
    /** Handler for favorite toggle */
    onFavoriteToggle?: (favorite: boolean) => void;
    /** Handler for more options */
    onMoreOptions?: () => void;
    /** Whether the card is currently selected */
    selected?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Locale for date formatting */
    locale?: string;
    /** Labels for localization */
    labels?: {
        specs?: string;
        spec?: string;
        updated?: string;
        noDescription?: string;
        toggleFavorite?: string;
        moreOptions?: string;
    };
}
export declare function ProjectCard({ project, onClick, onFavoriteToggle, onMoreOptions, selected, className, locale, labels, }: ProjectCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=project-card.d.ts.map