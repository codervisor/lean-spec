import { LucideIcon } from 'lucide-react';
import { SpecPriority } from '../../types/specs';
export interface PriorityConfig {
    icon: LucideIcon;
    label: string;
    className: string;
}
/**
 * Default priority configuration
 */
export declare const defaultPriorityConfig: Record<SpecPriority, PriorityConfig>;
export interface PriorityBadgeProps {
    /** The priority to display */
    priority: string;
    /** Additional CSS classes */
    className?: string;
    /** Show only icon, no label */
    iconOnly?: boolean;
    /** Custom label override */
    label?: string;
    /** Custom priority configuration */
    priorityConfig?: Record<string, PriorityConfig>;
}
export declare function PriorityBadge({ priority, className, iconOnly, label, priorityConfig, }: PriorityBadgeProps): import("react/jsx-runtime").JSX.Element;
/**
 * Get the default label for a priority
 */
export declare function getPriorityLabel(priority: string, priorityConfig?: Record<string, PriorityConfig>): string;
//# sourceMappingURL=priority-badge.d.ts.map