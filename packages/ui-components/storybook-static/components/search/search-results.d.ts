import { LightweightSpec } from '../../types/specs';
export interface SearchResultsProps {
    results: LightweightSpec[];
    query: string;
    isSearching?: boolean;
    onSpecClick?: (specId: string) => void;
}
export declare function SearchResults({ results, query, isSearching, onSpecClick, }: SearchResultsProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=search-results.d.ts.map