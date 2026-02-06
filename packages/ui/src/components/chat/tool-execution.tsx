import { useState } from 'react';
import { 
  Badge 
} from '@/library';
import { 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Terminal, 
  AlertCircle 
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '@/library';
import { useTranslation } from 'react-i18next';

export interface ToolExecutionProps {
  toolCallId: string;
  toolName: string;
  input?: unknown;
  output?: unknown;
  state?: string; // 'running' | 'result' | 'error' essentially
  errorMessage?: string; // if state is error
}

export function ToolExecution({ toolName, input, output, state, errorMessage }: ToolExecutionProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);

  const isComplete = state === 'result' || output !== undefined || state === 'error';
  const isError = state === 'error' || errorMessage;

  return (
    <div className="border rounded-md my-2 overflow-hidden bg-card">
      <div 
        className={cn(
          "flex items-center justify-between p-2 cursor-pointer hover:bg-muted/50 transition-colors",
          isOpen && "bg-muted/50"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
           <div className="bg-muted p-1.5 rounded-md">
             {isError ? <AlertCircle className="h-4 w-4 text-destructive" /> : 
              isComplete ? <Terminal className="h-4 w-4 text-green-500" /> : 
              <Loader2 className="h-4 w-4 animate-spin text-primary" />}
           </div>
           <div className="flex flex-col">
              <span className="text-sm font-medium leading-none">{toolName}</span>
              <span className="text-[10px] text-muted-foreground">
                  {isError ? t('chat.toolExecution.status.failed') : isComplete ? t('chat.toolExecution.status.completed') : t('chat.toolExecution.status.running')}
              </span>
           </div>
        </div>
        <div className="flex items-center gap-2">
            {isComplete && <Badge variant="outline" className="text-[10px] h-5">{t('chat.toolExecution.status.success')}</Badge>}
            {isError && <Badge variant="destructive" className="text-[10px] h-5">{t('chat.toolExecution.status.error')}</Badge>}
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {isOpen && (
        <div className="border-t bg-muted/20">
            {(input && (
                <div className="p-2 border-b last:border-0 relative group">
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase px-1">{t('chat.toolExecution.labels.input')}</div>
                    <div className="rounded-md overflow-hidden text-xs">
                        <SyntaxHighlighter 
                            language="json" 
                            style={vscDarkPlus} 
                            customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0.375rem' }}
                        >
                            {JSON.stringify(input, null, 2)}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )) as React.ReactNode}
            
            {(output && (
                <div className="p-2 relative group">
                  <div className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase px-1">{t('chat.toolExecution.labels.output')}</div>
                    <div className="rounded-md overflow-hidden text-xs">
                         <SyntaxHighlighter 
                            language="json" 
                            style={vscDarkPlus} 
                            customStyle={{ margin: 0, padding: '0.75rem', borderRadius: '0.375rem' }}
                        >
                            {JSON.stringify(output, null, 2)}
                        </SyntaxHighlighter>
                    </div>
                </div>
            )) as React.ReactNode}
             {errorMessage && (
                <div className="p-2 relative group">
                  <div className="text-[10px] font-semibold text-destructive mb-1 uppercase px-1">{t('chat.toolExecution.labels.error')}</div>
                     <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md font-mono">
                        {errorMessage}
                     </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
