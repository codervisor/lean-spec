import { SpecPriority } from '../../types/specs';
/**
 * Inline priority editor component
 * Framework-agnostic version that accepts onPriorityChange callback
 */
import * as React from 'react';
export interface PriorityConfig {
    icon: React.ComponentType<{
        className?: string;
    }>;
    label: string;
    className: string;
}
export declare const defaultPriorityConfig: Record<SpecPriority, PriorityConfig>;
export interface PriorityEditorProps {
    currentPriority: SpecPriority;
    onPriorityChange: (newPriority: SpecPriority) => Promise<void> | void;
    disabled?: boolean;
    config?: Partial<Record<SpecPriority, Partial<PriorityConfig>>>;
    className?: string;
    ariaLabel?: string;
}
export declare function PriorityEditor({ currentPriority, onPriorityChange, disabled, config: customConfig, className, ariaLabel, }: PriorityEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=priority-editor.d.ts.map