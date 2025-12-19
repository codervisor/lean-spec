export interface ProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (path: string) => Promise<void> | void;
    onBrowseFolder?: () => Promise<string | null>;
    isLoading?: boolean;
    labels?: {
        title?: string;
        descriptionPicker?: string;
        descriptionManual?: string;
        pathLabel?: string;
        pathPlaceholder?: string;
        pathHelp?: string;
        action?: string;
        adding?: string;
        cancel?: string;
        browseFolders?: string;
        enterManually?: string;
    };
}
export declare function ProjectDialog({ open, onOpenChange, onSubmit, onBrowseFolder, isLoading, labels, }: ProjectDialogProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=project-dialog.d.ts.map