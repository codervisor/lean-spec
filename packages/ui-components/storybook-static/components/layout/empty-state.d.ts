import { LucideIcon } from 'lucide-react';
export interface EmptyStateAction {
    label: string;
    onClick?: () => void;
    href?: string;
}
export interface EmptyStateProps {
    /** Icon to display */
    icon: LucideIcon;
    /** Title text */
    title: string;
    /** Description text */
    description: string;
    /** Optional action button */
    action?: EmptyStateAction;
    /** Additional CSS classes */
    className?: string;
}
export declare function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=empty-state.d.ts.map