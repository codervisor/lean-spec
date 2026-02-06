"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
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
  className?: string;
} & (
    | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
    | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
  );

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

  const icons: Record<ToolPart["state"], ReactNode> = {
    "input-streaming": <CircleIcon className="size-4" />,
    "input-available": <ClockIcon className="size-4 animate-pulse" />,
    "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
    "approval-responded": <CheckCircleIcon className="size-4 text-blue-600" />,
    "output-available": <CheckCircleIcon className="size-4 text-green-600" />,
    "output-error": <XCircleIcon className="size-4 text-red-600" />,
    "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  };

  return (
    <Badge className="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");

  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="size-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title ?? derivedName}</span>
        {getStatusBadge(state)}
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

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => {
  const { t } = useTranslation("common");

  if (input === undefined || input === null) {
    return null;
  }

  return (
    <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
      <ToolCodeBlock
        label={t("chat.toolExecution.labels.input")}
        language="json"
        value={input}
      />
    </div>
  );
};

export type ToolOutputProps = ComponentProps<"div"> & {
  output?: ToolPart["output"];
  errorText?: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  const { t } = useTranslation("common");

  if (!(output || errorText)) {
    return null;
  }

  const hasOutput = output !== undefined && output !== null;
  const isCustomOutput = hasOutput && isValidElement(output);

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
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
          (isCustomOutput ? (
            <div className="space-y-2">
              <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {t("chat.toolExecution.labels.output")}
              </h4>
              <div className="text-foreground">{output as ReactNode}</div>
            </div>
          ) : (
            <ToolCodeBlock
              label={t("chat.toolExecution.labels.output")}
              language="json"
              value={output}
            />
          ))}
      </div>
    </div>
  );
};
