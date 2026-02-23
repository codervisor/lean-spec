export const DEFAULT_TOOL_RESULT_MAX_LINES = 500;

export type TruncatedText = {
  fullText: string;
  truncatedText: string;
  isTruncated: boolean;
  totalLines: number;
  hiddenLines: number;
};

export const safeStringify = (value: unknown): string => {
  try {
    const seen = new WeakSet<object>();

    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "bigint") {
          return val.toString();
        }

        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) {
            return "[Circular]";
          }
          seen.add(val);
        }

        return val;
      },
      2
    );
  } catch (error) {
    return String(error instanceof Error ? error.message : value);
  }
};

export const toDisplayString = (value: unknown): string =>
  typeof value === "string" ? value : safeStringify(value);

export const truncateLines = (
  text: string,
  maxLines: number = DEFAULT_TOOL_RESULT_MAX_LINES
): TruncatedText => {
  const lines = text.split("\n");
  const totalLines = lines.length;

  if (maxLines <= 0 || totalLines <= maxLines) {
    return {
      fullText: text,
      truncatedText: text,
      isTruncated: false,
      totalLines,
      hiddenLines: 0,
    };
  }

  const truncatedText = lines.slice(0, maxLines).join("\n");

  return {
    fullText: text,
    truncatedText,
    isTruncated: true,
    totalLines,
    hiddenLines: totalLines - maxLines,
  };
};

export const getTruncatedText = (
  value: unknown,
  maxLines: number = DEFAULT_TOOL_RESULT_MAX_LINES
): TruncatedText => truncateLines(toDisplayString(value), maxLines);
