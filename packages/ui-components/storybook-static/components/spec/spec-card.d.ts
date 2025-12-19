import { LightweightSpec } from '../../types/specs';
export interface SpecCardProps {
    /** Spec data to display */
    spec: Pick<LightweightSpec, 'specNumber' | 'specName' | 'title' | 'status' | 'priority' | 'tags' | 'updatedAt'>;
    /** Click handler */
    onClick?: () => void;
    /** Whether the card is currently selected */
    selected?: boolean;
    /** Additional CSS classes */
    className?: string;
    /** Locale for date formatting */
    locale?: string;
    /** Maximum number of tags to display */
    maxTags?: number;
}
export declare function SpecCard({ spec, onClick, selected, className, locale, maxTags, }: SpecCardProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=spec-card.d.ts.map