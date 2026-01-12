/**
 * Project Avatar Component
 * Displays a project avatar with initials and custom color
 */

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ProjectAvatarProps {
  name: string;
  color?: string;
  icon?: string; // Optional icon URL/path
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
};

/**
 * Get initials from project name
 * Takes first letter of first two words, or first two letters if single word
 */
function getInitials(name: string): string {
  if (!name) return '??';
  
  const words = name.trim().split(/\s+/);
  
  if (words.length >= 2) {
    // Two or more words: first letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else {
    // Single word: first two letters (or one if too short)
    const word = words[0];
    return word.length >= 2 
      ? (word[0] + word[1]).toUpperCase()
      : word[0].toUpperCase();
  }
}

/**
 * Get contrasting text color for background
 */
function getContrastColor(hexColor?: string): string {
  if (!hexColor) return '#ffffff';
  
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function ProjectAvatar({ 
  name, 
  color = 'hsl(var(--primary))', 
  icon,
  size = 'md',
  className 
}: ProjectAvatarProps) {
  const initials = getInitials(name);
  const textColor = getContrastColor(color.startsWith('#') ? color : undefined);
  
  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {icon && <AvatarImage src={icon} alt={name} />}
      <AvatarFallback 
        className="font-semibold border"
        style={{ 
          backgroundColor: color,
          color: textColor
        }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
