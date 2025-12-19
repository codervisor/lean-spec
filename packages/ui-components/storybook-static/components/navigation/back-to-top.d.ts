/**
 * BackToTop component
 * Floating button that scrolls to the top of the page
 */
export interface BackToTopProps {
    /** Scroll threshold before showing button (in pixels) */
    threshold?: number;
    /** Additional CSS classes */
    className?: string;
    /** Position from bottom (in pixels or CSS value) */
    bottom?: string | number;
    /** Position from right (in pixels or CSS value) */
    right?: string | number;
}
export declare function BackToTop({ threshold, className, bottom, right, }: BackToTopProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=back-to-top.d.ts.map