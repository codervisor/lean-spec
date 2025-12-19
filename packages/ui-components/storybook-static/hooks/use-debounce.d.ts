/**
 * Hook for debouncing a value
 */
export declare function useDebounce<T>(value: T, delay: number): T;
/**
 * Hook for debouncing a callback function
 */
export declare function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(callback: T, delay: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=use-debounce.d.ts.map