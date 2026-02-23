"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";

interface ToolInputUIViewProps {
  input: unknown;
  className?: string;
}

/**
 * Renders tool input as a styled key-value definition list.
 * Handles flat objects, nested objects (collapsible), arrays, and primitives.
 */
export const ToolInputUIView = ({ input, className }: ToolInputUIViewProps) => {
  if (input === undefined || input === null) return null;

  if (typeof input !== "object") {
    return (
      <div className={cn("text-xs text-foreground", className)}>
        <PrimitiveValue value={input} />
      </div>
    );
  }

  if (Array.isArray(input)) {
    return (
      <div className={cn("space-y-1 text-xs", className)}>
        {input.map((item, index) => (
          <div key={index} className="rounded-md border bg-muted/20 p-2">
            {typeof item === "object" && item !== null ? (
              <KeyValueList data={item as Record<string, unknown>} />
            ) : (
              <PrimitiveValue value={item} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("text-xs", className)}>
      <KeyValueList data={input as Record<string, unknown>} />
    </div>
  );
};

function KeyValueList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <span className="text-muted-foreground italic">{"{ }"}</span>
    );
  }

  return (
    <dl className="grid gap-1.5">
      {entries.map(([key, value]) => (
        <KeyValuePair key={key} label={key} value={value} />
      ))}
    </dl>
  );
}

function KeyValuePair({ label, value }: { label: string; value: unknown }) {
  const isNested =
    typeof value === "object" && value !== null && !Array.isArray(value);
  const isArray = Array.isArray(value);

  if (isNested) {
    return <CollapsibleNested label={label} data={value as Record<string, unknown>} />;
  }

  if (isArray) {
    return (
      <div className="flex flex-col gap-1">
        <dt className="font-medium text-muted-foreground">{label}</dt>
        <dd className="pl-3">
          {value.length === 0 ? (
            <span className="text-muted-foreground italic">{"[ ]"}</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {value.map((item, index) =>
                typeof item === "object" && item !== null ? (
                  <div
                    key={index}
                    className="rounded-md border bg-muted/20 p-1.5 text-[10px]"
                  >
                    {JSON.stringify(item)}
                  </div>
                ) : (
                  <span
                    key={index}
                    className="rounded-md bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]"
                  >
                    {String(item)}
                  </span>
                )
              )}
            </div>
          )}
        </dd>
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <dt className="shrink-0 font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all">
        <PrimitiveValue value={value} />
      </dd>
    </div>
  );
}

function CollapsibleNested({
  label,
  data,
}: {
  label: string;
  data: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="flex cursor-pointer items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronRightIcon
          className={cn(
            "size-3 transition-transform",
            open && "rotate-90"
          )}
        />
        {label}
        <span className="text-[10px] text-muted-foreground/60">
          {`{${Object.keys(data).length}}`}
        </span>
      </button>
      {open && (
        <div className="mt-1 ml-3 border-l pl-3">
          <KeyValueList data={data} />
        </div>
      )}
    </div>
  );
}

function PrimitiveValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">null</span>;
  }
  if (typeof value === "boolean") {
    return (
      <span
        className={cn(
          "font-mono",
          value
            ? "text-green-700 dark:text-green-400"
            : "text-red-700 dark:text-red-400"
        )}
      >
        {String(value)}
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span className="font-mono text-blue-700 dark:text-blue-400">
        {String(value)}
      </span>
    );
  }
  // String — truncate very long values
  const str = String(value);
  const isLong = str.length > 200;
  return (
    <span className="font-mono text-foreground">
      {isLong ? `${str.slice(0, 200)}…` : str}
    </span>
  );
}
