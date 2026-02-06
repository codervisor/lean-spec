import { ProjectAvatar as UIProjectAvatar, getColorFromString } from '@/library';

interface ProjectAvatarProps {
  name: string;
  color?: string | null;
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ProjectAvatar({
  name,
  color,
  icon,
  size = 'md',
  className,
}: ProjectAvatarProps) {
  return (
    <UIProjectAvatar
      name={name}
      color={color || undefined}
      icon={icon}
      size={size}
      className={className}
    />
  );
}

// Re-export for backward compatibility
export { getColorFromString as getColorForName };
