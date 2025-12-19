/**
 * Project Avatar Component
 * Displays a project avatar with initials and custom color
 */
export interface ProjectAvatarProps {
    /** Project name (used for initials) */
    name: string;
    /** Custom color (hex) - if not provided, will be generated from name */
    color?: string;
    /** Optional icon URL/path */
    icon?: string;
    /** Size variant */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Additional CSS classes */
    className?: string;
}
export declare function ProjectAvatar({ name, color, icon, size, className, }: ProjectAvatarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=project-avatar.d.ts.map