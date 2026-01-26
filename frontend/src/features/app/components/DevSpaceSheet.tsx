import { useState, useEffect } from 'react';
import { Loader2, Code2, Copy, Terminal, Key, Braces } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAppLogs, type AppInterfaces } from '@/lib/api';
import { Separator } from '@/components/ui/separator';
import { generateInterface, generateInterfaceFromStoredInterfaces } from '@/lib/type-generators';

interface DevSpaceSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  appName: string;
  appId: string;
  apiKey?: string;
  interfaces?: AppInterfaces | null;
  latestTestResult?: Record<string, unknown> | null;
  sampleData?: string;
}

export function DevSpaceSheet({
  isOpen,
  onOpenChange,
  appName,
  appId,
  apiKey,
  interfaces,
  latestTestResult,
  sampleData,
}: DevSpaceSheetProps) {
  const [interfaceCode, setInterfaceCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const endpointUrl = `${window.location.origin}/api/v1/analyze/${appId}`;

  const generateCurl = () => {
    const inputData = sampleData 
      ? JSON.stringify({ input: { data: sampleData } })
      : '{"input": {"data": "your data here"}}';
    
    const escapedData = inputData.replace(/'/g, "'\\''");
    
    return `curl -X POST "${endpointUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" \\
  -d '${escapedData}'`;
  };

  useEffect(() => {
    if (!isOpen) {
      setHasFetched(false);
      return;
    }

    if (latestTestResult && Object.keys(latestTestResult).length > 0) {
      setInterfaceCode(generateInterface(appName, latestTestResult));
      return;
    }

    if (hasFetched) return;

    const fetchFromLogs = async () => {
      setIsLoading(true);
      try {
        const { logs } = await getAppLogs(appId, 1, 0);
        const successLog = logs.find(log => log.status === 'success' && log.output);
        
        if (successLog?.output && Object.keys(successLog.output).length > 0) {
          setInterfaceCode(generateInterface(appName, successLog.output));
        } else if (interfaces) {
          setInterfaceCode(generateInterfaceFromStoredInterfaces(appName, interfaces));
        }
      } catch {
        if (interfaces) {
          setInterfaceCode(generateInterfaceFromStoredInterfaces(appName, interfaces));
        }
      } finally {
        setIsLoading(false);
        setHasFetched(true);
      }
    };

    fetchFromLogs();
  }, [isOpen, latestTestResult, appId, appName, hasFetched, interfaces]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary" />
                API Endpoint
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(endpointUrl, 'Endpoint')}
                className="shrink-0 h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="editor-panel p-3">
              <code className="text-sm font-mono text-foreground overflow-x-auto">
                POST {endpointUrl}
              </code>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" />
                Authentication
              </h3>
              {apiKey && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(`X-API-Key: ${apiKey}`, 'API Key header')}
                  className="shrink-0 h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            <div className="editor-panel p-3">
              <code className="text-sm font-mono text-foreground break-all">
                X-API-Key: {apiKey || 'YOUR_API_KEY'}
              </code>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Terminal className="w-4 h-4 text-primary" />
                cURL
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(generateCurl(), 'cURL command')}
                className="shrink-0 h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="editor-panel max-h-[200px]">
              <pre className="p-3 overflow-auto text-xs font-mono text-foreground whitespace-pre-wrap break-all max-h-[200px]">
                {generateCurl()}
              </pre>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Braces className="w-4 h-4 text-primary" />
                Response Interface
              </h3>
              {!isLoading && interfaceCode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(interfaceCode, 'Interface')}
                  className="shrink-0 h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {isLoading && (
              <div className="editor-panel p-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            )}

            {!isLoading && interfaceCode && (
              <div className="editor-panel max-h-[230px]">
                <pre className="p-3 overflow-auto text-xs font-mono text-foreground max-h-[230px]">
                  {interfaceCode}
                </pre>
              </div>
            )}

            {!isLoading && !interfaceCode && (
              <div className="editor-panel p-3 text-muted-foreground text-sm">
                Run a test to generate a TypeScript interface from the response.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
