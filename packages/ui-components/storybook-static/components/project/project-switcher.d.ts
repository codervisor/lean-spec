export interface Project {
    id: string;
    name: string;
    path?: string;
    color?: string;
    favorite?: boolean;
}
export interface ProjectSwitcherProps {
    currentProject?: Project | null;
    projects: Project[];
    isLoading?: boolean;
    collapsed?: boolean;
    isSwitching?: boolean;
    onProjectSelect?: (projectId: string) => void;
    onAddProject?: () => void;
    onManageProjects?: () => void;
    labels?: {
        switching?: string;
        placeholder?: string;
        searchPlaceholder?: string;
        noProject?: string;
        projects?: string;
        createProject?: string;
        manageProjects?: string;
    };
}
export declare function ProjectSwitcher({ currentProject, projects, isLoading, collapsed, isSwitching, onProjectSelect, onAddProject, onManageProjects, labels, }: ProjectSwitcherProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=project-switcher.d.ts.map