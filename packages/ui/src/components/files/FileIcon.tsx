/**
 * FileIcon - material-style file type icons for the file explorer
 */

import {
  File, FileText, Code2, Code, Braces, FileSliders,
  Paintbrush2, Globe, Terminal, Coffee, Database, Image, Cpu,
} from 'lucide-react';
import { cn } from '@/library';

export interface FileIconProps {
  name: string;
  className?: string;
}

export function FileIcon({ name, className }: FileIconProps) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const base = 'w-4 h-4 flex-shrink-0';

  switch (ext) {
    case 'ts':
      return <Code2 className={cn(base, 'text-blue-500', className)} />;
    case 'tsx':
      return <Code2 className={cn(base, 'text-blue-400', className)} />;
    case 'js':
    case 'mjs':
    case 'cjs':
      return <Code2 className={cn(base, 'text-yellow-400', className)} />;
    case 'jsx':
      return <Code2 className={cn(base, 'text-yellow-300', className)} />;
    case 'rs':
      return <Cpu className={cn(base, 'text-orange-500', className)} />;
    case 'py':
      return <Code className={cn(base, 'text-green-500', className)} />;
    case 'go':
      return <Code2 className={cn(base, 'text-cyan-500', className)} />;
    case 'java':
    case 'kt':
    case 'kts':
      return <Coffee className={cn(base, 'text-orange-400', className)} />;
    case 'json':
    case 'jsonc':
      return <Braces className={cn(base, 'text-yellow-500', className)} />;
    case 'yaml':
    case 'yml':
    case 'toml':
      return <FileSliders className={cn(base, 'text-purple-400', className)} />;
    case 'md':
    case 'mdx':
      return <FileText className={cn(base, 'text-sky-400', className)} />;
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <Paintbrush2 className={cn(base, 'text-pink-400', className)} />;
    case 'html':
    case 'htm':
      return <Globe className={cn(base, 'text-orange-400', className)} />;
    case 'svg':
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'ico':
      return <Image className={cn(base, 'text-green-400', className)} />;
    case 'sh':
    case 'bash':
    case 'zsh':
    case 'fish':
      return <Terminal className={cn(base, 'text-muted-foreground', className)} />;
    case 'sql':
      return <Database className={cn(base, 'text-blue-300', className)} />;
    case 'xml':
    case 'xhtml':
      return <Globe className={cn(base, 'text-amber-400', className)} />;
    case 'c':
    case 'h':
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'hpp':
      return <Cpu className={cn(base, 'text-blue-300', className)} />;
    default:
      return <File className={cn(base, 'text-muted-foreground', className)} />;
  }
}
