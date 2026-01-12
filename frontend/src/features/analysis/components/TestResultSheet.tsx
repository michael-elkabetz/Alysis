import { Loader2, FlaskConical } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { LatencyBadge } from './LatencyBadge';
import { TokenUsageDisplay } from './TokenUsageDisplay';

interface TestResult {
  output: Record<string, unknown>;
  rawResponse: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
}

type TestStatus = 'idle' | 'running' | 'generating_interfaces';

interface TestResultSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  testStatus?: TestStatus;
  result: TestResult | null;
}

const STATUS_TEXT: Record<TestStatus, string> = {
  idle: '',
  running: 'Running test...',
  generating_interfaces: 'Generating response interfaces...',
};

export function TestResultSheet({
  isOpen,
  onOpenChange,
  isLoading,
  testStatus = 'running',
  result,
}: TestResultSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[500px] sm:max-w-[500px] bg-card border-border p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FlaskConical className="w-4 h-4 text-primary" />
              </div>
              <SheetTitle className="text-lg">Test Result</SheetTitle>
              {result && (
                <div className="flex items-center gap-1.5 ml-2">
                  <LatencyBadge latencyMs={result.latencyMs} />
                </div>
              )}
            </div>
          </div>
          {result && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <TokenUsageDisplay tokenUsage={result.tokenUsage} />
            </div>
          )}
        </SheetHeader>
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {STATUS_TEXT[testStatus] || 'Running test...'}
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
