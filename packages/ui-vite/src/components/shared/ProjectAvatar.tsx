import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@leanspec/ui-components';
import { cn } from '../../lib/utils';

interface ProjectAvatarProps {
  name: string;
  color?: string | null;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  if (!name) return '??';

  const words = name.trim().split(/\s+/);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  const word = words[0];
  return word.length >= 2 ? (word[0] + word[1]).toUpperCase() : word[0].toUpperCase();
}

function getContrastColor(hexColor?: string): string | undefined {
  if (!hexColor) return undefined;

  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function ProjectAvatar({
  name,
  color = 'hsl(var(--primary))',
  icon,
  size = 'md',
  className,
}: ProjectAvatarProps) {
  const initials = React.useMemo(() => getInitials(name), [name]);
  const textColor = React.useMemo(() => getContrastColor(color?.startsWith('#') ? color : undefined), [color]);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {icon && <AvatarImage src={icon} alt={name} />}
      <AvatarFallback
        className="font-semibold border"
        style={{
          backgroundColor: color || undefined,
          ...(textColor && { color: textColor }),
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
