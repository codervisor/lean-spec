import { SpecStatus } from '../../types/specs';
/**
 * Inline status editor component
 * Framework-agnostic version that accepts onStatusChange callback
 */
import * as React from 'react';
export interface StatusConfig {
    icon: React.ComponentType<{
        className?: string;
    }>;
    label: string;
    className: string;
}
export declare const defaultStatusConfig: Record<SpecStatus, StatusConfig>;
export interface StatusEditorProps {
    currentStatus: SpecStatus;
    onStatusChange: (newStatus: SpecStatus) => Promise<void> | void;
    disabled?: boolean;
    config?: Partial<Record<SpecStatus, Partial<StatusConfig>>>;
    className?: string;
    ariaLabel?: string;
}
export declare function StatusEditor({ currentStatus, onStatusChange, disabled, config: customConfig, className, ariaLabel, }: StatusEditorProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=status-editor.d.ts.map