import { cn } from "@/lib/utils";
import { Terminal } from "lucide-react";
import { type ComponentProps, useState } from "react";

/**
 * Known runner IDs with dedicated icons.
 * Falls back to Terminal icon for unknown runners.
 */
export type KnownRunnerId =
  | "claude"
  | "copilot"
  | "codex"
  | "opencode"
  | "aider"
  | "cline"
  | "gemini"
  | "cursor"
  | "windsurf"
  | "droid"
  | "kiro"
  | "kimi"
  | "qodo"
  | "amp"
  | "trae"
  | "qwen-code"
  | "goose"
  | "openhands"
  | "continue"
  | "crush"
  | "roo"
  | "codebuddy"
  | "kilo"
  | "augment"
  | "antigravity"
  | (string & {});

/**
 * Runners with SVG icons available in /icons/runners/
 */
const runnersWithSvgIcons = new Set([
  "claude",
  "copilot",
  "codex",
  "gemini",
  "cursor",
  "windsurf",
  "opencode",
  "amp",
  "antigravity",
]);

/**
 * Runners that should be rendered as monochrome masks (adapting to text color)
 */
const monochromeRunners = new Set([
  "cursor",
  "codex",
  "copilot",
  "windsurf",
]);

export type RunnerLogoProps = ComponentProps<"div"> & {
  /**
   * Runner ID (e.g., "claude", "cursor", "aider")
   */
  runnerId: KnownRunnerId;
  /**
   * Size of the logo container in pixels (default: 40)
   */
  size?: number;
  /**
   * Show fallback icon if runner logo is not found
   */
  showFallback?: boolean;
};

/**
 * Universal styles for letter-based fallback avatars
 */
const fallbackStyles = {
  bg: "bg-muted",
  text: "text-foreground",
};

/**
 * Set of known runner IDs (for determining if we show initials vs terminal icon)
 */
const knownRunners = new Set([
  "claude",
  "copilot",
  "codex",
  "opencode",
  "aider",
  "cline",
  "gemini",
  "cursor",
  "windsurf",
  "droid",
  "kiro",
  "kimi",
  "qodo",
  "amp",
  "trae",
  "qwen-code",
  "goose",
  "openhands",
  "continue",
  "crush",
  "roo",
  "codebuddy",
  "kilo",
  "augment",
  "antigravity",
]);

/**
 * Get the display letter(s) for a runner
 */
function getRunnerInitials(runnerId: string): string {
  // Special cases for multi-word or hyphenated names
  if (runnerId === "qwen-code") return "QC";
  if (runnerId === "copilot") return "GH";
  if (runnerId === "opencode") return "OC";
  if (runnerId === "openhands") return "OH";
  if (runnerId === "codebuddy") return "CB";

  // Default: uppercase first letter
  return runnerId.charAt(0).toUpperCase();
}

/**
 * RunnerLogo displays a branded logo for AI coding agents/runners.
 * Uses SVG icons when available, falling back to letter-based avatars.
 */
export const RunnerLogo = ({
  runnerId,
  size = 40,
  showFallback = true,
  className,
  ...props
}: RunnerLogoProps) => {
  const [imgError, setImgError] = useState(false);
  const hasSvgIcon = runnersWithSvgIcons.has(runnerId) && !imgError;

  const isKnownRunner = knownRunners.has(runnerId);
  const initials = getRunnerInitials(runnerId);
  const iconSize = Math.round(size * 0.5);
  const fontSize = size <= 32 ? "text-xs" : size <= 48 ? "text-sm" : "text-base";

  if (!showFallback && !isKnownRunner) {
    return null;
  }

  // Render SVG image for runners with icons
  if (hasSvgIcon) {
    // For monochrome runners, use the SVG as a mask so it adopts the text color
    if (monochromeRunners.has(runnerId)) {
      return (
        <div
          className={cn(
            "shrink-0 rounded-md flex items-center justify-center overflow-hidden",
            fallbackStyles.bg,
            fallbackStyles.text,
            className
          )}
          style={{ width: size, height: size }}
          {...props}
        >
          <div
            className="w-3/5 h-3/5 bg-current"
            style={{
              maskImage: `url(/icons/runners/${runnerId}.svg)`,
              maskSize: "contain",
              maskPosition: "center",
              maskRepeat: "no-repeat",
              WebkitMaskImage: `url(/icons/runners/${runnerId}.svg)`,
              WebkitMaskSize: "contain",
              WebkitMaskPosition: "center",
              WebkitMaskRepeat: "no-repeat",
            }}
          />
        </div>
      );
    }

    return (
      <div
        className={cn(
          "shrink-0 rounded-md flex items-center justify-center overflow-hidden",
          fallbackStyles.bg,
          className
        )}
        style={{ width: size, height: size }}
        {...props}
      >
        <img
          src={`/icons/runners/${runnerId}.svg`}
          alt={`${runnerId} logo`}
          className={cn("w-3/5 h-3/5 object-contain")}
          style={{ filter: "var(--runner-icon-filter, none)" }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback to letter-based avatar
  return (
    <div
      className={cn(
        "shrink-0 rounded-md flex items-center justify-center font-semibold",
        fallbackStyles.bg,
        fallbackStyles.text,
        fontSize,
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {isKnownRunner ? (
        initials
      ) : (
        <Terminal style={{ width: iconSize, height: iconSize }} />
      )}
    </div>
  );
};

export type RunnerLogoSmallProps = ComponentProps<"span"> & {
  runnerId: KnownRunnerId;
  size?: number;
};

/**
 * Small inline runner logo for use in badges, lists, etc.
 */
export const RunnerLogoSmall = ({
  runnerId,
  size = 16,
  className,
  ...props
}: RunnerLogoSmallProps) => {
  const isKnownRunner = knownRunners.has(runnerId);
  const initials = getRunnerInitials(runnerId);
  const fontSize = size <= 16 ? "text-[10px]" : "text-xs";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded items-center justify-center font-medium",
        fallbackStyles.bg,
        fallbackStyles.text,
        fontSize,
        className
      )}
      style={{ width: size, height: size }}
      {...props}
    >
      {isKnownRunner ? initials : "?"}
    </span>
  );
};
