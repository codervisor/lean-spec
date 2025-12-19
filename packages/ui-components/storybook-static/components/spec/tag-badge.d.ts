/**
 * Tag badge component for displaying spec tags
 */
export interface TagBadgeProps {
    /** Tag name to display */
    tag: string;
    /** Additional CSS classes */
    className?: string;
    /** Show icon */
    showIcon?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Whether the tag is removable */
    removable?: boolean;
    /** Remove handler */
    onRemove?: () => void;
}
export declare function TagBadge({ tag, className, showIcon, onClick, removable, onRemove, }: TagBadgeProps): import("react/jsx-runtime").JSX.Element;
export interface TagListProps {
    /** Tags to display */
    tags: string[];
    /** Maximum tags to show before truncating */
    maxVisible?: number;
    /** Additional CSS classes */
    className?: string;
    /** Click handler for individual tags */
    onTagClick?: (tag: string) => void;
}
export declare function TagList({ tags, maxVisible, className, onTagClick }: TagListProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=tag-badge.d.ts.map