/**
 * FilterSelect component
 * Simple dropdown for filtering
 */
import * as React from 'react';
export interface FilterOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}
export interface FilterSelectProps {
    /** Current selected value */
    value?: string;
    /** Available options */
    options: FilterOption[];
    /** Callback when selection changes */
    onChange?: (value: string) => void;
    /** Placeholder when no value selected */
    placeholder?: string;
    /** Additional CSS classes */
    className?: string;
    /** Allow clearing selection */
    clearable?: boolean;
    /** Label for clear option */
    clearLabel?: string;
}
export declare function FilterSelect({ value, options, onChange, placeholder, className, clearable, clearLabel, }: FilterSelectProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=filter-select.d.ts.map