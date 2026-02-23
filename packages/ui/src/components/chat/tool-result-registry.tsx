"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
  CodeBlockTitle,
  MessageResponse,
  cn,
} from "@/library";
import { getTruncatedText, toDisplayString } from "./tool-result-utils";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const getNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const JsonResultView = ({ output }: { output: unknown }) => {
  const { t } = useTranslation("common");
  const code = toDisplayString(output);

  return (
    <CodeBlock code={code} language="json" maxHeight={300}>
      <CodeBlockHeader>
        <CodeBlockTitle>
          {t("chat.toolExecution.labels.output")}
        </CodeBlockTitle>
        <CodeBlockActions>
          <CodeBlockCopyButton
            aria-label={t("chat.toolExecution.actions.copy")}
            size="icon-sm"
          />
        </CodeBlockActions>
      </CodeBlockHeader>
    </CodeBlock>
  );
};

const SearchResultView = ({ output }: { output: unknown }) => {
  if (!isRecord(output) || !Array.isArray(output.results)) {
    return <JsonResultView output={output} />;
  }

  const results = output.results as Record<string, unknown>[];
  const query = getString(output.query);
  const count = getNumber(output.count);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {query && (
          <span className="rounded-md bg-muted/40 px-2 py-1 font-mono text-[10px]">
            {query}
          </span>
        )}
        {typeof count === "number" && (
          <Badge className="text-[10px]" variant="secondary">
            {count}
          </Badge>
        )}
      </div>
      <div className="grid gap-2">
        {results.map((result, index) => {
          const title =
            getString(result.title) ??
            getString(result.name) ??
            getString(result.path) ??
            `#${index + 1}`;
          const path = getString(result.path);
          const snippet = getString(result.snippet);

          return (
            <div
              className="rounded-md border bg-muted/20 p-2"
              key={path ?? `${title}-${index}`}
            >
              <div className="font-medium text-foreground">{title}</div>
              {path && (
                <div className="text-[10px] text-muted-foreground font-mono">
                  {path}
                </div>
              )}
              {snippet && (
                <div className="mt-1 text-muted-foreground">
                  {snippet}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BoardResultView = ({ output }: { output: unknown }) => {
  if (!isRecord(output) || !Array.isArray(output.groups)) {
    return <JsonResultView output={output} />;
  }

  const groups = output.groups as Record<string, unknown>[];

  return (
    <div className="grid gap-2 text-xs">
      {groups.map((group, index) => {
        const name = getString(group.name) ?? `#${index + 1}`;
        const count = getNumber(group.count);
        const specs = Array.isArray(group.specs)
          ? (group.specs as Record<string, unknown>[])
          : [];

        return (
          <div className="rounded-md border bg-muted/20 p-2" key={`${name}-${index}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-foreground truncate">{name}</div>
              {typeof count === "number" && (
                <Badge className="text-[10px]" variant="secondary">
                  {count}
                </Badge>
              )}
            </div>
            {specs.length > 0 && (
              <div className="mt-2 grid gap-1 text-[10px] text-muted-foreground">
                {specs.slice(0, 6).map((spec, specIndex) => {
                  const title =
                    getString(spec.title) ??
                    getString(spec.path) ??
                    getString(spec.name) ??
                    `#${specIndex + 1}`;
                  const status = getString(spec.status);

                  return (
                    <div
                      className="flex items-center justify-between gap-2"
                      key={`${title}-${specIndex}`}
                    >
                      <span className="truncate">{title}</span>
                      {status && (
                        <Badge className="text-[10px]" variant="outline">
                          {status}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const ViewResultView = ({ output }: { output: unknown }) => {
  const { t } = useTranslation("common");

  if (!isRecord(output) || typeof output.content !== "string") {
    return <JsonResultView output={output} />;
  }

  const title = getString(output.title);
  const path = getString(output.path);
  const status = getString(output.status);
  const tags = getStringArray(output.tags);
  const content = output.content as string;

  const [showAll, setShowAll] = useState(false);
  const truncated = useMemo(() => getTruncatedText(content), [content]);
  const displayContent = showAll || !truncated.isTruncated
    ? truncated.fullText
    : truncated.truncatedText;

  return (
    <div className="space-y-3">
      {(title || path || status || tags.length > 0) && (
        <div className="space-y-1 text-xs">
          {title && <div className="text-sm font-semibold">{title}</div>}
          {path && (
            <div className="text-[10px] text-muted-foreground font-mono">
              {path}
            </div>
          )}
          {(status || tags.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {status && (
                <Badge className="text-[10px]" variant="secondary">
                  {status}
                </Badge>
              )}
              {tags.map((tag) => (
                <Badge className="text-[10px]" key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
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
        </div>
      )}
      <div
        className={cn("rounded-md border bg-muted/10 p-3 text-sm")}
      >
        <MessageResponse>{displayContent}</MessageResponse>
      </div>
    </div>
  );
};

export type ToolResultRenderer = (output: unknown) => ReactNode;

const registry: Record<string, ToolResultRenderer> = {
  search: (output) => <SearchResultView output={output} />,
  board: (output) => <BoardResultView output={output} />,
  view: (output) => <ViewResultView output={output} />,
};

export const ToolResultRegistry = {
  resolve: (toolName: string): ToolResultRenderer | null =>
    registry[toolName] ?? null,
  render: (toolName: string, output: unknown): ReactNode => {
    const renderer = registry[toolName];
    return renderer ? renderer(output) : <JsonResultView output={output} />;
  },
};
