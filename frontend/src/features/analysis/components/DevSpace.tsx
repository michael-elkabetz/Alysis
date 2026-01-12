import { useState } from 'react';
import { Copy, Terminal, Loader2, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateTyphoeusInterface } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DevSpaceProps {
  analysisName: string;
  analysisId: string;
  latestTestResult?: Record<string, unknown> | null;
}

export function DevSpace({ analysisName, analysisId, latestTestResult }: DevSpaceProps) {
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const endpointUrl = `${window.location.origin}/api/v1/analyze/${analysisId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          Dev Space
        </h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="connection">Connection Info</TabsTrigger>
          <TabsTrigger value="interface">Ruby Interface</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                API Endpoint
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-background/50 p-2 rounded text-sm font-mono overflow-x-auto">
                  POST {endpointUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(endpointUrl)}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Required Headers
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-primary">Content-Type:</span>
                  <span className="text-muted-foreground">application/json</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-primary">X-API-Key:</span>
                  <span className="text-muted-foreground">YOUR_API_KEY</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interface" className="mt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-medium">Typhoeus Client Wrapper</h3>
              <p className="text-sm text-muted-foreground">
                Generate a Ruby client for this app based on the latest test output.
              </p>
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !latestTestResult}
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
                  Generate Client
                </>
              )}
            </Button>
          </div>

          {!latestTestResult && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
              Run a test in the Editor first to generate an interface based on the output structure.
            </div>
          )}

          {generatedCode && (
            <div className="relative rounded-lg overflow-hidden border border-border/50 bg-secondary/20">
              <div className="absolute right-2 top-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(generatedCode)}
                  className="h-8 w-8 bg-background/50 hover:bg-background"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto text-sm font-mono text-muted-foreground">
                {generatedCode}
              </pre>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
