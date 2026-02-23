"use client";

import { Badge } from "../ui/badge";
import { ClockIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { ToolPart } from "./tool";

/**
 * Formats milliseconds into a human-readable duration string.
 * <1s → "Xms", 1-59s → "Xs", ≥60s → "Xm Ys"
 */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

const RUNNING_STATES = new Set<ToolPart["state"]>([
  "input-streaming",
  "input-available",
  "approval-requested",
]);

export interface ToolDurationProps {
  state: ToolPart["state"];
}

/**
 * Live timer that tracks tool execution duration.
 * - Captures start time on mount via useState initializer
 * - Ticks every second while running
 * - Stops ticking on completion (elapsed freezes at last tick)
 * - Renders as a small Badge with ClockIcon
 */
export const ToolDuration = ({ state }: ToolDurationProps) => {
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  const isRunning = RUNNING_STATES.has(state);

  // Live tick while running; stops when state is no longer running
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  // Don't render if we couldn't measure any duration
  // (tool completed before component mounted, e.g. streamed results)
  if (elapsed === 0 && !isRunning) return null;

  return (
    <Badge
      className="gap-1 rounded-full text-[10px] font-normal"
      variant="outline"
    >
      <ClockIcon className="size-3" />
      {formatElapsed(elapsed)}
    </Badge>
  );
};
