import { LucideIcon } from 'lucide-react';
export interface StatsCardProps {
    /** Title of the stat */
    title: string;
    /** Main value to display */
    value: number | string;
    /** Optional subtitle or description */
    subtitle?: string;
    /** Icon to display */
    icon?: LucideIcon;
    /** Icon color class */
    iconColorClass?: string;
    /** Background gradient color class */
    gradientClass?: string;
    /** Trend direction */
    trend?: 'up' | 'down' | 'neutral';
    /** Trend percentage or label */
    trendValue?: string;
    /** Additional CSS classes */
    className?: string;
}
export declare function StatsCard({ title, value, subtitle, icon: Icon, iconColorClass, gradientClass, trend, trendValue, className, }: StatsCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=stats-card.d.ts.map