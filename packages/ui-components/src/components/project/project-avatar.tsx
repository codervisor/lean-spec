/**
 * Project Avatar Component
 * Displays a project avatar with initials and custom color
 */

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getContrastColor, getColorFromString } from '@/lib/color-utils';

export interface ProjectAvatarProps {
  /** Project name (used for initials) */
  name: string;
  /** Custom color (hex) - if not provided, will be generated from name */
  color?: string;
  /** Optional icon URL/path */
  icon?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Additional CSS classes */
  className?: string;
}

export function ProjectAvatar({
  name,
  color,
  icon,
  size = 'md',
  className,
}: ProjectAvatarProps) {
  const initials = getInitials(name);
  const bgColor = color || getColorFromString(name);
  const textColor = getContrastColor(bgColor.startsWith('#') ? bgColor : undefined);

  return (
    <Avatar size={size} className={className}>
      {icon && <AvatarImage src={icon} alt={name} />}
      <AvatarFallback
        className="font-semibold border"
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
