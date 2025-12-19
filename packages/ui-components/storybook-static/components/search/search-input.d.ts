/**
 * SearchInput component
 * Input field with search icon and keyboard shortcut hint
 */
import * as React from 'react';
export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    /** Current search value */
    value?: string;
    /** Callback when value changes */
    onChange?: (value: string) => void;
    /** Callback when search is submitted (Enter key) */
    onSearch?: (value: string) => void;
    /** Show keyboard shortcut hint */
    showShortcut?: boolean;
    /** Keyboard shortcut key (displayed in hint) */
    shortcutKey?: string;
    /** Show clear button when there's a value */
    clearable?: boolean;
    /** Additional CSS classes for the container */
    containerClassName?: string;
}
export declare function SearchInput({ value, onChange, onSearch, showShortcut, shortcutKey, clearable, className, containerClassName, placeholder, ...props }: SearchInputProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=search-input.d.ts.map