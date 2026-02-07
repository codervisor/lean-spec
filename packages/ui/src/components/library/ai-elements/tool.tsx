"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  BracesIcon,
  ChevronDownIcon,
  LayoutListIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
} from "./code-block";
import { getTruncatedText } from "../../chat/tool-result-utils";
import { getToolPrefixIcon, humanizeToolName } from "./tool-icon-registry";
import { ToolDuration } from "./tool-duration";
import { ToolInputUIView } from "./tool-input-ui-view";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  description?: string;
  className?: string;
} & (
    | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
    | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
  );

const getStatusVariant = (status: ToolPart["state"]): "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "output-error":
      return "destructive";
    case "approval-requested":
    case "output-denied":
      return "outline";
    default:
      return "secondary";
  }
};

export const getStatusBadge = (status: ToolPart["state"]) => {
  const labels: Record<ToolPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  return (
    <Badge className="rounded-full text-xs" variant={getStatusVariant(status)}>
      {labels[status]}
    </Badge>
  );
};

const SHOW_DURATION_STATES = new Set<ToolPart["state"]>([
  "input-available",
  "output-available",
  "output-error",
  "output-denied",
]);

export const ToolHeader = ({
  className,
  title,
  description,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");
  const resolvedToolName =
    type === "dynamic-tool" ? toolName : derivedName;
  const { icon: PrefixIcon, className: iconClassName } = getToolPrefixIcon(
    state,
    resolvedToolName
  );

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <PrefixIcon className={iconClassName} />
        <span className="font-medium text-sm">
          {title ?? description ?? humanizeToolName(derivedName)}
        </span>
        {getStatusBadge(state)}
        {SHOW_DURATION_STATES.has(state) && <ToolDuration state={state} />}
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
  viewMode?: "ui" | "json";
  onViewModeChange?: (mode: "ui" | "json") => void;
};

type ToolCodeBlockProps = {
  label: string;
  value: unknown;
  language: ComponentProps<typeof CodeBlock>["language"];
};

const ToolCodeBlock = ({ label, value, language }: ToolCodeBlockProps) => {
  const { t } = useTranslation("common");
  const [showAll, setShowAll] = useState(false);
  const truncated = useMemo(() => getTruncatedText(value), [value]);
  const code = showAll || !truncated.isTruncated
    ? truncated.fullText
    : truncated.truncatedText;

  return (
    <CodeBlock code={code} language={language}>
      <CodeBlockHeader>
        <CodeBlockTitle>{label}</CodeBlockTitle>
        <CodeBlockActions>
          {truncated.isTruncated && (
            <Button
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowAll((prev) => !prev)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {showAll
                ? t("chat.toolExecution.actions.showLess")
                : t("chat.toolExecution.actions.showAll")}
            </Button>
          )}
          <CodeBlockCopyButton
            aria-label={t("chat.toolExecution.actions.copy")}
            size="icon-sm"
          />
        </CodeBlockActions>
      </CodeBlockHeader>
    </CodeBlock>
  );
};

export const ToolInput = ({
  className,
  input,
  viewMode: controlledViewMode,
  onViewModeChange,
  ...props
}: ToolInputProps) => {
  const { t } = useTranslation("common");
  const [internalViewMode, setInternalViewMode] = useState<"ui" | "json">("ui");

  const isControlled = controlledViewMode !== undefined;
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  if (input === undefined || input === null) {
    return null;
  }

  return (
    <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
      {!isControlled && (
        <div className="flex items-center justify-end gap-1">
          <ViewToggle
            mode={viewMode}
            onModeChange={setViewMode}
          />
        </div>
      )}
      {viewMode === "ui" ? (
        <ToolInputUIView input={input} />
      ) : (
        <ToolCodeBlock
          label={t("chat.toolExecution.labels.input")}
          language="json"
          value={input}
        />
      )}
    </div>
  );
};

export type ToolOutputProps = ComponentProps<"div"> & {
  output?: ToolPart["output"];
  rawOutput?: unknown;
  errorText?: ToolPart["errorText"];
  viewMode?: "ui" | "json";
  onViewModeChange?: (mode: "ui" | "json") => void;
};

export const ToolOutput = ({
  className,
  output,
  rawOutput,
  errorText,
  viewMode: controlledViewMode,
  onViewModeChange,
  ...props
}: ToolOutputProps) => {
  const { t } = useTranslation("common");
  const [internalViewMode, setInternalViewMode] = useState<"ui" | "json">("ui");

  const isControlled = controlledViewMode !== undefined;
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = onViewModeChange ?? setInternalViewMode;

  if (!(output || errorText)) {
    return null;
  }

  const hasOutput = output !== undefined && output !== null;
  const isCustomOutput = hasOutput && isValidElement(output);
  const jsonValue = rawOutput !== undefined ? rawOutput : output;

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      {hasOutput && !errorText && !isControlled && (
        <div className="flex items-center justify-end gap-1">
          <ViewToggle
            mode={viewMode}
            onModeChange={setViewMode}
          />
        </div>
      )}
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
        style={
          isCustomOutput
            ? {
              contentVisibility: "auto",
              containIntrinsicSize: "auto 200px",
            }
            : undefined
        }
      >
        {errorText && (
          <ToolCodeBlock
            label={t("chat.toolExecution.labels.error")}
            language="json"
            value={errorText}
          />
        )}
        {hasOutput &&
          (viewMode === "ui" ? (
            isCustomOutput ? (
              <div className="space-y-2 p-3">
                <div className="text-foreground">{output as ReactNode}</div>
              </div>
            ) : (
              <div className="p-3">
                <ToolInputUIView input={output} />
              </div>
            )
          ) : (
            <ToolCodeBlock
              label={t("chat.toolExecution.labels.output")}
              language="json"
              value={jsonValue}
            />
          ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  View toggle (UI / JSON)                                                   */
/* -------------------------------------------------------------------------- */

interface ViewToggleProps {
  mode: "ui" | "json";
  onModeChange: (mode: "ui" | "json") => void;
}

const ViewToggle = ({ mode, onModeChange }: ViewToggleProps) => {
  const { t } = useTranslation("common");
  return (
    <div className="inline-flex items-center rounded-md border bg-muted/30 p-0.5">
      <Button
        size="sm"
        variant={mode === "ui" ? "secondary" : "ghost"}
        className={cn(
          "h-5 gap-1 px-1.5 text-[10px] cursor-pointer",
          mode === "ui" && "shadow-sm"
        )}
        onClick={() => onModeChange("ui")}
        type="button"
      >
        <LayoutListIcon className="size-3" />
        {t("chat.toolExecution.viewToggle.ui")}
      </Button>
      <Button
        size="sm"
        variant={mode === "json" ? "secondary" : "ghost"}
        className={cn(
          "h-5 gap-1 px-1.5 text-[10px] cursor-pointer",
          mode === "json" && "shadow-sm"
        )}
        onClick={() => onModeChange("json")}
        type="button"
      >
        <BracesIcon className="size-3" />
        {t("chat.toolExecution.viewToggle.json")}
      </Button>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  ToolBody – Tabbed Input / Output container                                */
/* -------------------------------------------------------------------------- */

export type ToolBodyProps = {
  input?: ToolPart["input"];
  output?: ToolPart["output"];
  rawOutput?: unknown;
  errorText?: ToolPart["errorText"];
  className?: string;
};

export const ToolBody = ({
  input,
  output,
  rawOutput,
  errorText,
  className,
}: ToolBodyProps) => {
  const { t } = useTranslation("common");
  const [viewMode, setViewMode] = useState<"ui" | "json">("ui");

  const hasInput = input !== undefined && input !== null;
  const hasOutput = output !== undefined || !!errorText;
  const defaultTab = hasOutput ? "output" : "input";

  // If neither input nor output, render nothing
  if (!hasInput && !hasOutput) return null;

  // Single mode: Input only
  if (!hasInput) {
    return (
      <div className={cn("px-4 pb-4 space-y-2", className)}>
        <div className="flex items-center justify-between h-7">
          <span className="text-xs font-medium text-muted-foreground">{t("chat.toolExecution.tabs.output")}</span>
          <ViewToggle mode={viewMode} onModeChange={setViewMode} />
        </div>
        <ToolOutput
          output={output}
          rawOutput={rawOutput}
          errorText={errorText}
          className="p-0"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    );
  }

  // Single mode: Input only (!hasOutput)
  if (!hasOutput) {
    return (
      <div className={cn("px-4 pb-4 space-y-2", className)}>
        <div className="flex items-center justify-between h-7">
          <span className="text-xs font-medium text-muted-foreground">{t("chat.toolExecution.tabs.input")}</span>
          <ViewToggle mode={viewMode} onModeChange={setViewMode} />
        </div>
        <ToolInput
          input={input}
          className="p-0"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </div>
    );
  }

  return (
    <Tabs defaultValue={defaultTab} className={cn("px-4 pb-4", className)}>
      <div className="flex items-center justify-between mb-2 h-7 gap-2">
        <TabsList className="h-7 w-auto">
          <TabsTrigger value="input" className="h-5 cursor-pointer text-xs px-3">
            {t("chat.toolExecution.tabs.input")}
          </TabsTrigger>
          <TabsTrigger value="output" className="h-5 cursor-pointer text-xs px-3">
            {t("chat.toolExecution.tabs.output")}
          </TabsTrigger>
        </TabsList>
        <ViewToggle mode={viewMode} onModeChange={setViewMode} />
      </div>

      <TabsContent value="input" className="mt-0">
        <ToolInput
          input={input}
          className="p-0"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </TabsContent>
      <TabsContent value="output" className="mt-0">
        <ToolOutput
          output={output}
          rawOutput={rawOutput}
          errorText={errorText}
          className="p-0"
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      </TabsContent>
    </Tabs>
  );
};
