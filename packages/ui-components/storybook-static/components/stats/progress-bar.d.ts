/**
 * ProgressBar component
 * Displays a horizontal progress bar with optional label
 */
export interface ProgressBarProps {
    /** Progress value (0-100) */
    value: number;
    /** Label to display */
    label?: string;
    /** Show percentage */
    showPercentage?: boolean;
    /** Color variant */
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Additional CSS classes */
    className?: string;
}
export declare function ProgressBar({ value, label, showPercentage, variant, size, className, }: ProgressBarProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=progress-bar.d.ts.map