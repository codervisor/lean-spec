import * as React from 'react';
/**
 * Simple Avatar implementation without @radix-ui/react-avatar dependency.
 * Provides basic accessibility with role and aria-label attributes.
 * For full accessibility features, consider using @radix-ui/react-avatar.
 */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Size variant */
    size?: 'sm' | 'md' | 'lg' | 'xl';
}
declare const Avatar: React.ForwardRefExoticComponent<AvatarProps & React.RefAttributes<HTMLDivElement>>;
export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
}
declare const AvatarImage: React.ForwardRefExoticComponent<AvatarImageProps & React.RefAttributes<HTMLImageElement>>;
export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
}
declare const AvatarFallback: React.ForwardRefExoticComponent<AvatarFallbackProps & React.RefAttributes<HTMLDivElement>>;
export { Avatar, AvatarImage, AvatarFallback };
//# sourceMappingURL=avatar.d.ts.map