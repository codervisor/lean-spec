import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Simple Avatar implementation without @radix-ui/react-avatar dependency.
 * Provides basic accessibility with role and aria-label attributes.
 * For full accessibility features, consider using @radix-ui/react-avatar.
 */

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => (
    <div
      ref={ref}
      role="img"
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Avatar.displayName = 'Avatar';

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, alt = '', ...props }, ref) => (
    <img ref={ref} alt={alt} className={cn('aspect-square h-full w-full', className)} {...props} />
  )
);
AvatarImage.displayName = 'AvatarImage';

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted',
        className
      )}
      {...props}
    />
  )
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
