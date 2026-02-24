/**
 * CodeViewer - syntax-highlighted read-only code viewer using shiki
 * Spec 246 - Codebase File Viewing in @leanspec/ui
 */

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { Copy, Check, FileText } from 'lucide-react';
import { cn } from '@/library';
import { useTranslation } from 'react-i18next';
import {
  type BundledLanguage,
  type ThemedToken,
  createHighlighter,
} from 'shiki';
import type { FileContentResponse } from '../../types/api';
import { useThemeStore } from '../../stores/theme';

// Shiki bitflag checks
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag
const isItalic = (fontStyle: number | undefined) => fontStyle && fontStyle & 1;
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag
const isBold = (fontStyle: number | undefined) => fontStyle && fontStyle & 2;
// biome-ignore lint/suspicious/noBitwiseOperators: shiki bitflag
const isUnderline = (fontStyle: number | undefined) => fontStyle && fontStyle & 4;

// Singleton highlighter promise to avoid recreating on every render
let highlighterPromise: ReturnType<typeof createHighlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: [
        'typescript', 'javascript', 'rust', 'python', 'json', 'yaml', 'toml',
        'markdown', 'html', 'css', 'scss', 'go', 'java', 'c', 'cpp', 'ruby',
        'bash', 'sql', 'graphql', 'xml', 'swift', 'kotlin', 'php', 'csharp',
        'dockerfile', 'plaintext',
      ],
    });
  }
  return highlighterPromise;
}

interface CodeViewerProps {
  file: FileContentResponse;
  className?: string;
}

export function CodeViewer({ file, className }: CodeViewerProps) {
  const { t } = useTranslation('common');
  const { resolvedTheme } = useThemeStore();
  const [lines, setLines] = useState<ThemedToken[][] | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;

    const highlight = async () => {
      try {
        const hl = await getHighlighter();
        // Map language to a supported bundled language or fall back to plaintext
        const lang = (file.language as BundledLanguage) ?? 'plaintext';
        const shikiTheme = resolvedTheme === 'dark' ? 'github-dark' : 'github-light';
        const result = hl.codeToTokensBase(file.content, {
          lang: hl.getLoadedLanguages().includes(lang) ? lang : 'plaintext',
          theme: shikiTheme,
        });
        if (!cancelled) {
          setLines(result);
        }
      } catch {
        if (!cancelled) {
          // Fall back to plain text lines
          setLines(null);
        }
      }
    };

    void highlight();
    return () => { cancelled = true; };
  }, [file.content, file.language, resolvedTheme]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Breadcrumb / header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <span className="text-sm font-mono text-muted-foreground truncate" title={file.path}>
            {file.path}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {t('filesPage.lines', { count: file.lineCount })}
          </span>
          <button
            onClick={() => void handleCopy()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
            title={t('filesPage.copyPath')}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? t('filesPage.pathCopied') : t('filesPage.copyPath')}</span>
          </button>
        </div>
      </div>

      {/* Code area */}
      <pre
        ref={scrollRef}
        className="flex-1 overflow-auto text-sm font-mono leading-5 bg-[#f6f8fa] dark:bg-[#0d1117] m-0 p-0"
        style={{ backgroundColor: resolvedTheme === 'dark' ? '#0d1117' : '#f6f8fa' }}
        aria-label={file.path}
      >
        {lines ? (
          <code className="block">
            {lines.map((lineTokens, lineIdx) => (
              <Line
                key={`l-${lineIdx}`}
                lineNumber={lineIdx + 1}
                tokens={lineTokens}
                bgColor={resolvedTheme === 'dark' ? '#0d1117' : '#f6f8fa'}
              />
            ))}
          </code>
        ) : (
          // Fallback: plain text with line numbers
          <code className="block">
            {file.content.split('\n').map((line, lineIdx) => (
              <span key={`pl-${lineIdx}`} className="flex">
                <LineNumber number={lineIdx + 1} bgColor={resolvedTheme === 'dark' ? '#0d1117' : '#f6f8fa'} />
                <span className="px-4 whitespace-pre text-foreground">{line}</span>
              </span>
            ))}
          </code>
        )}
      </pre>
    </div>
  );
}

function LineNumber({ number, bgColor }: { number: number; bgColor: string }) {
  return (
    <span
      className="inline-block w-10 flex-shrink-0 text-right pr-3 text-muted-foreground/50 select-none border-r border-border/50 mr-3 sticky left-0 z-10"
      style={{ backgroundColor: bgColor }}
      aria-hidden="true"
    >
      {number}
    </span>
  );
}

interface LineProps {
  lineNumber: number;
  tokens: ThemedToken[];
  bgColor: string;
}

function Line({ lineNumber, tokens, bgColor }: LineProps) {
  return (
    <span className="flex hover:bg-black/5 dark:hover:bg-white/5">
      <LineNumber number={lineNumber} bgColor={bgColor} />
      <span className="px-0 whitespace-pre flex-1">
        {tokens.length === 0 ? (
          '\n'
        ) : (
          tokens.map((token, i) => (
            <span
              key={i}
              style={
                {
                  color: token.color,
                  backgroundColor: token.bgColor,
                  ...token.htmlStyle,
                  fontStyle: isItalic(token.fontStyle) ? 'italic' : undefined,
                  fontWeight: isBold(token.fontStyle) ? 'bold' : undefined,
                  textDecoration: isUnderline(token.fontStyle) ? 'underline' : undefined,
                } as CSSProperties
              }
            >
              {token.content}
            </span>
          ))
        )}
      </span>
    </span>
  );
}
