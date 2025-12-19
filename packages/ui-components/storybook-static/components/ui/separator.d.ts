import * as React from 'react';
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Orientation of the separator */
    orientation?: 'horizontal' | 'vertical';
    /** Whether the separator is decorative (accessible) */
    decorative?: boolean;
}
declare const Separator: React.ForwardRefExoticComponent<SeparatorProps & React.RefAttributes<HTMLDivElement>>;
export { Separator };
//# sourceMappingURL=separator.d.ts.map