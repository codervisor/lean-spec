"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleIcon,
  ClockIcon,
  XCircleIcon,
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

/* -------------------------------------------------------------------------- */
/*  Tool wrapper                                                              */
/* -------------------------------------------------------------------------- */

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Status badge (original style with icons)                                  */
/* -------------------------------------------------------------------------- */

const statusLabels: Record<ToolPart["state"], string> = {
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "input-available": "Running",
  "input-streaming": "Pending",
  "output-available": "Completed",
  "output-denied": "Denied",
  "output-error": "Error",
};

const statusIcons: Record<ToolPart["state"], ReactNode> = {
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
  "input-available": <ClockIcon className="size-4 animate-pulse" />,
  "input-streaming": <CircleIcon className="size-4" />,
  "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
};

export const getStatusBadge = (status: ToolPart["state"]) => (
  <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
    {statusIcons[status]}
    {statusLabels[status]}
  </Badge>
);

/* -------------------------------------------------------------------------- */
/*  ToolHeader                                                                */
/* -------------------------------------------------------------------------- */

export const ToolHeader = ({
  className,
  title,
  description: _description,
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <PrefixIcon className={iconClassName} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">{resolvedToolName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <span className="font-medium text-sm">
          {title ?? humanizeToolName(derivedName)}
        </span>
        {getStatusBadge(state)}
        <ToolDuration state={state} />
      </div>
      <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

/* -------------------------------------------------------------------------- */
/*  ToolContent                                                               */
/* -------------------------------------------------------------------------- */

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 space-y-4 p-4 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
);

/* -------------------------------------------------------------------------- */
/*  ToolCodeBlock (internal helper with truncation + copy)                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  ToolInput                                                                 */
/* -------------------------------------------------------------------------- */

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input }: ToolInputProps) => {
  const { t } = useTranslation("common");

  if (input === undefined || input === null) return null;

  return (
    <Collapsible defaultOpen className={cn("group/input space-y-2 overflow-hidden", className)}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1.5 select-none">
        <ChevronRightIcon className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/input:rotate-90" />
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {t("chat.toolExecution.tabs.input")}
        </h4>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-md bg-muted/50">
          <ToolCodeBlock
            label={t("chat.toolExecution.labels.input", "Input")}
            language="json"
            value={input}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/* -------------------------------------------------------------------------- */
/*  ToolOutput                                                                */
/* -------------------------------------------------------------------------- */

export type ToolOutputProps = ComponentProps<"div"> & {
  output?: ToolPart["output"];
  rawOutput?: unknown;
  errorText?: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  rawOutput,
  errorText,
}: ToolOutputProps) => {
  const { t } = useTranslation("common");

  if (!(output || errorText)) return null;

  const hasOutput = output !== undefined && output !== null;
  const isCustomOutput = hasOutput && isValidElement(output);
  const jsonValue = rawOutput !== undefined ? rawOutput : output;

  let OutputContent: ReactNode = null;
  if (hasOutput) {
    if (isCustomOutput) {
      OutputContent = <div>{output as ReactNode}</div>;
    } else if (typeof output === "object") {
      OutputContent = (
        <ToolCodeBlock
          label={t("chat.toolExecution.labels.output", "Result")}
          language="json"
          value={jsonValue}
        />
      );
    } else if (typeof output === "string") {
      OutputContent = (
        <ToolCodeBlock
          label={t("chat.toolExecution.labels.output", "Result")}
          language="json"
          value={output}
        />
      );
    } else {
      OutputContent = (
        <ToolCodeBlock
          label={t("chat.toolExecution.labels.output", "Result")}
          language="json"
          value={jsonValue}
        />
      );
    }
  }

  return (
    <Collapsible defaultOpen className={cn("group/output space-y-2", className)}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1.5 select-none">
        <ChevronRightIcon className="size-3 text-muted-foreground transition-transform duration-200 group-data-[state=open]/output:rotate-90" />
        <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {errorText
            ? t("chat.toolExecution.labels.error")
            : t("chat.toolExecution.labels.output")}
        </h4>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div
          className={cn(
            "rounded-md [&_table]:w-full",
            errorText
              ? "bg-destructive/10 text-destructive"
              : "bg-muted/50 text-foreground"
          )}
        >
          {errorText && (
            <ToolCodeBlock
              label={t("chat.toolExecution.labels.error", "Error")}
              language="json"
              value={errorText}
            />
          )}
          {OutputContent}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

/* -------------------------------------------------------------------------- */
/*  ToolBody – Input / Output container                                       */
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
  const hasInput = input !== undefined && input !== null;
  const hasOutput = output !== undefined || !!errorText;

  if (!hasInput && !hasOutput) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {hasInput && <ToolInput input={input} />}
      {hasOutput && (
        <ToolOutput output={output} rawOutput={rawOutput} errorText={errorText} />
      )}
    </div>
  );
};
