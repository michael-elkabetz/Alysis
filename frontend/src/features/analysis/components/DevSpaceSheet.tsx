import { useState } from 'react';
import { Loader2, Code2, Copy, Terminal, Key } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateTyphoeusInterface } from '@/lib/api';
import { Separator } from '@/components/ui/separator';

interface DevSpaceSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  analysisName: string;
  analysisId: string;
  apiKey?: string;
  latestTestResult?: Record<string, unknown> | null;
}

export function DevSpaceSheet({
  isOpen,
  onOpenChange,
  analysisName,
  analysisId,
  apiKey,
  latestTestResult,
}: DevSpaceSheetProps) {
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const endpointUrl = `${window.location.origin}/api/v1/analyze/${analysisId}`;

  const handleGenerate = async () => {
    if (!latestTestResult) {
      toast.error('Please run a test first to generate the interface based on the output.');
      return;
    }

    try {
      setIsGenerating(true);
      const { code } = await generateTyphoeusInterface(analysisName, latestTestResult);
      setGeneratedCode(code);
      toast.success('Interface generated successfully');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[600px] sm:max-w-[600px] bg-card border-border p-0 flex flex-col"
      >
        <SheetHeader className="px-6 pt-4 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <SheetTitle className="text-lg">Developer Space</SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* API Endpoint Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Code2 className="w-4 h-4" />
              API Endpoint
            </h3>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-foreground overflow-x-auto">
                  POST {endpointUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(endpointUrl, 'Endpoint')}
                  className="shrink-0 h-8 w-8"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* API Key Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4" />
              Authentication
            </h3>
            <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
              <div className="text-sm text-muted-foreground">
                Include the following header in your requests:
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-foreground">
                  X-API-Key: {apiKey ? apiKey.slice(0, 20) + '...' : 'YOUR_API_KEY'}
                </code>
                {apiKey && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(apiKey, 'API Key')}
                    className="shrink-0 h-8 w-8"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* TypeScript Interface Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4" />
                TypeScript Interface
              </h3>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !latestTestResult}
                size="sm"
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Code2 className="w-4 h-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            {!latestTestResult && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
                Run a test first to generate an interface based on the output structure.
              </div>
            )}

            {generatedCode && (
              <div className="relative rounded-lg overflow-hidden border border-border/50 bg-secondary/20">
                <div className="absolute right-2 top-2 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedCode, 'Code')}
                    className="h-8 w-8 bg-background/50 hover:bg-background"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground max-h-[400px] overflow-y-auto">
                  {generatedCode}
                </pre>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
