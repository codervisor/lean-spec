/**
 * Tool Icon Registry
 *
 * Maps MCP tool names to Lucide icons for display in the tool call UI.
 * Follows the keyword-matching PATTERNS array pattern from sub-spec-utils.ts.
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertCircleIcon,
  BarChart3Icon,
  CheckCircle2Icon,
  CoinsIcon,
  EyeIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  LinkIcon,
  ListIcon,
  LoaderIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  ShieldXIcon,
  UnlinkIcon,
  WrenchIcon,
} from "lucide-react";
import type { ToolPart } from "./tool";

/**
 * Direct mapping of known MCP tool names to Lucide icons.
 */
const TOOL_ICON_MAP: Record<string, LucideIcon> = {
  search: SearchIcon,
  board: LayoutDashboardIcon,
  view: EyeIcon,
  list: ListIcon,
  list_children: ListIcon,
  list_umbrellas: ListIcon,
  create: PlusIcon,
  update: PencilIcon,
  validate: CheckCircle2Icon,
  tokens: CoinsIcon,
  stats: BarChart3Icon,
  relationships: GitBranchIcon,
  deps: GitBranchIcon,
  link: LinkIcon,
  unlink: UnlinkIcon,
  set_parent: GitBranchIcon,
};

const FALLBACK_ICON: LucideIcon = WrenchIcon;

/**
 * Returns the Lucide icon for a known tool name, or the fallback WrenchIcon.
 */
export function getToolIcon(toolName: string): LucideIcon {
  return TOOL_ICON_MAP[toolName] ?? FALLBACK_ICON;
}

/**
 * Returns the appropriate prefix icon based on tool state:
 * - Running/streaming → LoaderIcon (animated)
 * - Completed → tool-specific icon from registry
 * - Error/denied → AlertCircleIcon or ShieldXIcon
 */
export function getToolPrefixIcon(
  state: ToolPart["state"],
  toolName: string
): { icon: LucideIcon; className: string } {
  switch (state) {
    case "input-streaming":
    case "input-available":
    case "approval-requested":
      return {
        icon: LoaderIcon,
        className: "size-4 animate-spin text-muted-foreground",
      };
    case "output-available":
    case "approval-responded":
      return {
        icon: getToolIcon(toolName),
        className: "size-4 text-muted-foreground",
      };
    case "output-error":
      return {
        icon: AlertCircleIcon,
        className: "size-4 text-destructive",
      };
    case "output-denied":
      return {
        icon: ShieldXIcon,
        className: "size-4 text-orange-600 dark:text-orange-400",
      };
    default:
      return {
        icon: getToolIcon(toolName),
        className: "size-4 text-muted-foreground",
      };
  }
}

/**
 * Humanizes a tool name for display.
 * Splits on `_`, `-`, and camelCase boundaries, then capitalizes each word.
 *
 * @example
 * humanizeToolName("read_file")      // "Read File"
 * humanizeToolName("list-children")   // "List Children"
 * humanizeToolName("getSpecStats")    // "Get Spec Stats"
 */
export function humanizeToolName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase → spaces
    .replace(/[_-]+/g, " ") // underscores/hyphens → spaces
    .replace(/\b\w/g, (char) => char.toUpperCase()) // capitalize first letters
    .trim();
}
