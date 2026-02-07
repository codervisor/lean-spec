/**
 * ProgressBar component
 * Displays a horizontal progress bar with optional label
 */

import { cn } from '@/lib/utils';

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

const variantClasses = {
  default: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-orange-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

export function ProgressBar({
  value,
  label,
  showPercentage = false,
  variant = 'default',
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-sm font-medium">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{Math.round(clampedValue)}%</span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', variantClasses[variant])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
