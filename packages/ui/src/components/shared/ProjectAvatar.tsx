import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@leanspec/ui-components';
import { cn } from '@leanspec/ui-components';

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

const AVATAR_COLORS = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#10b981', // emerald-500
  '#06b6d4', // cyan-500
  '#0ea5e9', // sky-500
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
  '#ec4899', // pink-500
  '#f43f5e', // rose-500
  '#78716c', // stone-500
];

export function getColorForName(name: string): string {
  if (!name) return 'hsl(var(--primary))';

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash % AVATAR_COLORS.length);
  return AVATAR_COLORS[index];
}

export function ProjectAvatar({
  name,
  color,
  icon,
  size = 'md',
  className,
}: ProjectAvatarProps) {
  const initials = React.useMemo(() => getInitials(name), [name]);

  const displayColor = React.useMemo(() => {
    if (color) return color;
    return getColorForName(name);
  }, [color, name]);

  const textColor = React.useMemo(() =>
    getContrastColor(displayColor?.startsWith('#') ? displayColor : undefined),
    [displayColor]);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {icon && <AvatarImage src={icon} alt={name} />}
      <AvatarFallback
        className="font-semibold border"
        style={{
          backgroundColor: displayColor,
          ...(textColor && { color: textColor }),
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
