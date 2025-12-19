/**
 * Tags editor component with add/remove functionality and autocomplete
 * Framework-agnostic version that accepts callbacks
 */
export interface TagsEditorProps {
    currentTags: string[];
    availableTags?: string[];
    onTagsChange: (newTags: string[]) => Promise<void> | void;
    onFetchAvailableTags?: () => Promise<string[]> | string[];
    disabled?: boolean;
    className?: string;
    labels?: {
        addTag?: string;
        removeTag?: string;
        searchTag?: string;
        createTag?: string;
        noResults?: string;
        existingTags?: string;
        createSection?: string;
        tagExists?: string;
    };
}
export declare function TagsEditor({ currentTags, availableTags: initialAvailableTags, onTagsChange, onFetchAvailableTags, disabled, className, labels: customLabels, }: TagsEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=tags-editor.d.ts.map