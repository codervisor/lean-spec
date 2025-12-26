import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import { ArrowLeft, Clock, Copy, ExternalLink, FileText, Hash, Layers, Type } from 'lucide-react';
import { Badge, Button, Card, CardContent } from '@leanspec/ui-components';
import { TableOfContents, TableOfContentsSidebar } from '../spec-detail/TableOfContents';
import { MermaidDiagram } from '../MermaidDiagram';
import type { ContextFileContent } from '../../lib/api';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../../lib/date-utils';

interface ContextFileDetailProps {
  file: ContextFileContent;
  projectRoot?: string;
  onBack?: () => void;
}

function toVSCodeUri(projectRoot: string, filePath: string) {
  const fullPath = filePath.startsWith('/') ? filePath : `${projectRoot}/${filePath}`;
  return `vscode://file${fullPath}`;
}

export function ContextFileDetail({ file, projectRoot, onBack }: ContextFileDetailProps) {
  const [copied, setCopied] = useState(false);
  const isMarkdown = file.name.toLowerCase().endsWith('.md');
  const isJson = file.name.toLowerCase().endsWith('.json');
  const { t, i18n } = useTranslation('common');

  const headingContent = useMemo(() => file.content, [file.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Failed to copy context content', err);
    }
  };

  const handleOpenInEditor = () => {
    if (!projectRoot) return;
    window.open(toVSCodeUri(projectRoot, file.path), '_blank');
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {t('contextPage.detail.back')}
              </Button>
            )}
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-semibold leading-tight break-words">{file.name}</h2>
              <span className="text-xs text-muted-foreground break-all">{file.path}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectRoot && (
              <Button variant="ghost" size="sm" onClick={handleOpenInEditor} className="h-8 px-3 text-xs">
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                {t('contextPage.detail.openInEditor')}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-3 text-xs">
              {copied ? <Hash className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? t('contextPage.detail.copySuccess') : t('contextPage.detail.copy')}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Type className="h-3 w-3" />
            {file.fileType || 'text'}
          </Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {t('contextPage.badges.tokens', { formattedCount: file.tokenCount.toLocaleString() })}
          </Badge>
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {t('contextPage.detail.lines', { count: file.lineCount })}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {t('contextPage.detail.modified', {
              date: formatDate(file.modified ?? file.modifiedAt, i18n.language),
            })}
          </span>
          <span className="text-muted-foreground">•</span>
          <span>{t('contextPage.detail.size', { size: (file.size / 1024).toFixed(1) })}</span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            {isJson ? (
              <pre className="p-3 text-sm overflow-x-auto bg-muted/40 rounded-md border whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(file.content), null, 2);
                  } catch (err) {
                    console.error('Failed to parse JSON context file', err);
                    return file.content;
                  }
                })()}
              </pre>
            ) : isMarkdown ? (
              <article className="prose prose-slate dark:prose-invert max-w-none prose-sm sm:prose-base">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSlug]}
                  components={{
                    pre: ({ children, ...props }) => {
                      const childArray = Array.isArray(children) ? children : [children];
                      const firstChild = childArray[0];
                      if (
                        firstChild &&
                        typeof firstChild === 'object' &&
                        'props' in firstChild &&
                        typeof (firstChild as { props?: { className?: string; children?: string } }).props?.className === 'string' &&
                        (firstChild as { props?: { className?: string } }).props?.className?.includes('language-mermaid')
                      ) {
                        const code = (firstChild as { props?: { children?: string } }).props?.children;
                        const content = typeof code === 'string' ? code : '';
                        return <MermaidDiagram chart={content} />;
                      }
                      return <pre {...props}>{children}</pre>;
                    },
                  }}
                >
                  {file.content}
                </ReactMarkdown>
              </article>
            ) : (
              <pre className="p-3 text-sm overflow-x-auto bg-muted/40 rounded-md border whitespace-pre-wrap">
                {file.content}
              </pre>
            )}
          </CardContent>
        </Card>

        {isMarkdown && (
          <aside className="hidden xl:block sticky top-28 h-[calc(100vh-8rem)] overflow-y-auto">
            <TableOfContentsSidebar content={headingContent} />
          </aside>
        )}
      </div>

      {isMarkdown && (
        <div className="xl:hidden">
          <TableOfContents content={headingContent} />
        </div>
      )}
    </div>
  );
}
