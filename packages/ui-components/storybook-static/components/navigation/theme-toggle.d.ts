/**
 * Theme Toggle component
 * Switches between light and dark themes
 * Framework-agnostic - no dependency on next-themes
 */
export type Theme = 'light' | 'dark' | 'system';
export interface ThemeToggleProps {
    /** Current theme */
    theme?: Theme;
    /** Callback when theme changes */
    onThemeChange?: (theme: Theme) => void;
    /** Additional CSS classes */
    className?: string;
    /** Size variant */
    size?: 'default' | 'sm' | 'lg' | 'icon';
}
export declare function ThemeToggle({ theme, onThemeChange, className, size, }: ThemeToggleProps): import("react/jsx-runtime").JSX.Element;
/**
 * Hook for managing theme state with localStorage persistence
 */
export declare function useTheme(defaultTheme?: Theme): {
    theme: Theme;
    setTheme: (newTheme: Theme) => void;
    mounted: boolean;
};
//# sourceMappingURL=theme-toggle.d.ts.map