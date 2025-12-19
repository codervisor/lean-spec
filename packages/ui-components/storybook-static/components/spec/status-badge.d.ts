import { LucideIcon } from 'lucide-react';
import { SpecStatus } from '../../types/specs';
export interface StatusConfig {
    icon: LucideIcon;
    label: string;
    className: string;
}
/**
 * Default status configuration
 */
export declare const defaultStatusConfig: Record<SpecStatus, StatusConfig>;
export interface StatusBadgeProps {
    /** The status to display */
    status: string;
    /** Additional CSS classes */
    className?: string;
    /** Show only icon, no label */
    iconOnly?: boolean;
    /** Custom label override */
    label?: string;
    /** Custom status configuration */
    statusConfig?: Record<string, StatusConfig>;
}
export declare function StatusBadge({ status, className, iconOnly, label, statusConfig, }: StatusBadgeProps): import("react/jsx-runtime").JSX.Element;
/**
 * Get the default label for a status
 */
export declare function getStatusLabel(status: string, statusConfig?: Record<string, StatusConfig>): string;
//# sourceMappingURL=status-badge.d.ts.map