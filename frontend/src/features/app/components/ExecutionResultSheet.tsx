import { Loader2, FlaskConical, AlertCircle } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LatencyBadge } from './LatencyBadge';
import { TokenUsageDisplay } from './TokenUsageDisplay';

interface ExecutionResult {
  output: Record<string, unknown>;
  rawResponse: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
  error?: string | null;
}

type ExecutionStatus = 'idle' | 'running' | 'generating_interfaces';

interface ExecutionResultSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  status?: ExecutionStatus;
  result: ExecutionResult | null;
  error?: string | null;
}

const STATUS_TEXT: Record<ExecutionStatus, string> = {
  idle: '',
  running: 'Running Analysis...',
  generating_interfaces: 'Generating response interfaces...',
};

export function ExecutionResultSheet({
  isOpen,
  onOpenChange,
  isLoading,
  status = 'running',
  result,
  error,
}: ExecutionResultSheetProps) {
  const displayError = error || result?.error;
  const hasError = !!displayError;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] bg-card border-border p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${hasError ? 'bg-destructive/10' : 'bg-primary/10'}`}>
                {hasError ? (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <FlaskConical className="w-4 h-4 text-primary" />
                )}
              </div>
              <SheetTitle className="text-lg">
                {hasError ? 'Execution Error' : 'Execution Result'}
              </SheetTitle>
              {result && !hasError && (
                <div className="flex items-center gap-1.5 ml-2">
                  <LatencyBadge latencyMs={result.latencyMs} />
                </div>
              )}
            </div>
          </div>
          {result && !hasError && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <TokenUsageDisplay tokenUsage={result.tokenUsage} />
            </div>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {STATUS_TEXT[status] || 'Running Analysis...'}
            </div>
          ) : hasError ? (
            <div className="editor-panel p-4 h-full overflow-auto border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive mb-2">Execution Failed</p>
                  <pre className="text-sm font-mono text-destructive/80 whitespace-pre-wrap break-words">
                    {displayError}
                  </pre>
                </div>
              </div>
            </div>
          ) : result ? (
            <div className="editor-panel p-4 h-full overflow-auto">
              <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words overflow-y-auto">
                {typeof result.output === 'object'
                  ? JSON.stringify(result.output, null, 2)
                  : result.rawResponse}
              </pre>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground/50">
              No result yet
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
