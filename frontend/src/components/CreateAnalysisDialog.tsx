import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Play,
  Save,
  Loader2,
  CheckCircle2,
  Copy,
  Sparkles,
  ChevronRight,
  FlaskConical,
  Zap,
  Clock,
} from 'lucide-react';
import {
  getVendorsAndModels,
  createAnalysis,
  testAnalysisPrompt,
  type CreateAnalysisDto,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CreateAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAppDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAppDialogProps) {
  const [step, setStep] = useState<'configure' | 'prompt' | 'test'>('configure');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    vendor: 'openai',
    model: 'gpt-4o',
  });
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{
    output: Record<string, unknown>;
    rawResponse: string;
    latencyMs: number;
    tokenUsage: { prompt: number; completion: number; total: number };
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showResultPanel, setShowResultPanel] = useState(false);
  const [savedAnalysis, setSavedAnalysis] = useState<{
    id: string;
    name: string;
    apiKey: { key: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-models'],
    queryFn: getVendorsAndModels,
  });

  const vendors = vendorsData?.vendors ?? [];
  const modelsByVendor = vendorsData?.modelsByVendor ?? {};

  useEffect(() => {
    const vendorModels = modelsByVendor[formData.vendor];
    if (vendorModels && vendorModels.length > 0) {
      setFormData((prev) => ({ ...prev, model: vendorModels[0].id }));
    }
  }, [formData.vendor, modelsByVendor]);

  const createMutation = useMutation({
    mutationFn: () => {
      const dto: CreateAnalysisDto = {
        name: formData.name,
        description: formData.description || undefined,
        systemPrompt: formData.systemPrompt,
        vendor: formData.vendor as 'openai' | 'anthropic' | 'gemini',
        model: formData.model,
      };
      return createAnalysis(dto);
    },
    onSuccess: (response) => {
      setSavedAnalysis({
        id: response.id,
        name: response.name,
        apiKey: response.apiKey,
      });
      toast.success('App created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleTest = async () => {
    if (!testInput.trim()) {
      toast.error('Please enter test data');
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      setShowResultPanel(true);

      const result = await testAnalysisPrompt({
        systemPrompt: formData.systemPrompt,
        vendor: formData.vendor as 'openai' | 'anthropic' | 'gemini',
        model: formData.model,
        input: { data: testInput },
      });

      setTestResult(result);
      toast.success(`Test completed in ${result.latencyMs}ms`);
    } catch (e) {
      toast.error((e as Error).message);
      setShowResultPanel(false);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!formData.systemPrompt.trim()) {
      toast.error('Please enter a system prompt');
      return;
    }
    createMutation.mutate();
  };

  const copyApiKey = () => {
    if (savedAnalysis?.apiKey.key) {
      navigator.clipboard.writeText(savedAnalysis.apiKey.key);
      setCopied(true);
      toast.success('API key copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getEndpointUrl = () => {
    if (!savedAnalysis) return '';
    return `${window.location.origin}/api/v1/analyze/${savedAnalysis.id}`;
  };

  const copyEndpoint = () => {
    const endpoint = getEndpointUrl();
    if (endpoint) {
      navigator.clipboard.writeText(endpoint);
      setCopiedEndpoint(true);
      toast.success('Endpoint URL copied');
      setTimeout(() => setCopiedEndpoint(false), 2000);
    }
  };

  const handleClose = () => {
    if (savedAnalysis) {
      onSuccess();
    }
    setStep('configure');
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      vendor: 'openai',
      model: 'gpt-4o',
    });
    setTestInput('');
    setTestResult(null);
    setShowResultPanel(false);
    setSavedAnalysis(null);
    setCopied(false);
    setCopiedEndpoint(false);
    onOpenChange(false);
  };

  const currentModels = modelsByVendor[formData.vendor] ?? [];

  const steps = [
    { id: 'configure', label: 'Configure', num: 1 },
    { id: 'prompt', label: 'Prompt', num: 2 },
    { id: 'test', label: 'Test', num: 3 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  const generateCurl = () => {
    if (!savedAnalysis) return '';
    return `curl -X POST "${window.location.origin}/api/v1/analyze/${savedAnalysis.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${savedAnalysis.apiKey.key}" \\
  -d '{"input": {"data": "your data here"}}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    toast.success('cURL command copied');
  };

  if (savedAnalysis) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl text-center">App Created Successfully</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-hidden">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">App Name</Label>
              <p className="mt-1.5 text-lg font-semibold text-foreground break-words">
                {savedAnalysis.name}
              </p>
              <p className="text-sm text-muted-foreground font-mono break-all">
                {savedAnalysis.id}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Endpoint URL</Label>
                <Button variant="ghost" size="icon" onClick={copyEndpoint} className="h-6 w-6 hover:bg-secondary" title="Copy Endpoint URL">
                  {copiedEndpoint ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <code className="block px-3 py-2.5 bg-[#f5f0e8] rounded-xl font-mono text-sm text-foreground truncate">
                {getEndpointUrl()}
              </code>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">API Key</Label>
                <Button variant="ghost" size="icon" onClick={copyApiKey} className="h-6 w-6 hover:bg-secondary" title="Copy API Key">
                  {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <code className="block px-3 py-2.5 bg-[#f5f0e8] rounded-xl font-mono text-sm text-foreground break-all">
                {savedAnalysis.apiKey.key}
              </code>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Quick Start</Label>
                <Button variant="ghost" size="icon" onClick={copyCurl} className="h-6 w-6 hover:bg-secondary" title="Copy cURL">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <pre className="px-3 py-2.5 bg-[#f5f0e8] rounded-xl text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap break-all">
{generateCurl()}
              </pre>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleClose} className="flex-1 btn-primary">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[700px] p-0 flex flex-col overflow-hidden bg-card border-border">
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="icon-container-glow p-2">
                <Sparkles className="w-4 h-4" />
              </div>
              <DialogTitle className="text-lg">Create New App</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground">
              Configure your AI app, test it, then deploy.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 bg-secondary/30">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => {
                  if (i === 0) setStep('configure');
                  else if (i === 1 && formData.name) setStep('prompt');
                  else if (i === 2 && formData.name && formData.systemPrompt) setStep('test');
                }}
                disabled={
                  (i === 1 && !formData.name) ||
                  (i === 2 && (!formData.name || !formData.systemPrompt)) ||
                  i === 3
                }
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  currentStepIndex >= i
                    ? 'text-primary'
                    : 'text-muted-foreground',
                  currentStepIndex === i && 'bg-primary/10',
                  (i > currentStepIndex) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'w-6 h-6 rounded-full text-xs flex items-center justify-center font-semibold transition-all',
                    currentStepIndex >= i
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {s.num}
                </span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>

        <div className={cn("flex-1 px-6 py-6", step === 'test' ? "overflow-y-auto" : "overflow-hidden")}>
          {step === 'configure' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Name</Label>
                <Input
                  id="name"
                  className="input-modern !bg-[#f5f0e8]"
                  placeholder="e.g., sentiment-analyzer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm">Description</Label>
                <Input
                  id="description"
                  className="input-modern !bg-[#f5f0e8]"
                  placeholder="What does this app do?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Provider</Label>
                  <Select
                    value={formData.vendor}
                    onValueChange={(v) => setFormData({ ...formData, vendor: v })}
                  >
                    <SelectTrigger className="input-modern !bg-[#f5f0e8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.id} className="focus:bg-secondary">
                          {vendor.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(v) => setFormData({ ...formData, model: v })}
                  >
                    <SelectTrigger className="input-modern !bg-[#f5f0e8]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {currentModels.map((model) => (
                        <SelectItem key={model.id} value={model.id} className="focus:bg-secondary">
                          {model.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === 'prompt' && (
            <div className="space-y-3 h-full flex flex-col">
              <Label htmlFor="systemPrompt" className="text-sm">System Prompt</Label>
              <Textarea
                id="systemPrompt"
                className="input-modern flex-1 resize-none font-mono text-sm !bg-[#f5f0e8] !border-0"
                placeholder="You are an AI assistant that analyzes data..."
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              />
            </div>
          )}

          {step === 'test' && (
            <div className="h-full flex flex-col">
              <Label htmlFor="testInput" className="text-sm mb-2">Test Input</Label>
              <Textarea
                id="testInput"
                className="input-modern flex-1 resize-none font-mono text-sm !bg-[#f5f0e8] !border-0"
                placeholder="Paste or type your test data..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
              />
            </div>
          )}

        </div>

        <div className="px-6 py-4 border-t border-border/50 bg-secondary/30 flex items-center justify-between">
          <Button variant="ghost" onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
          <div className="flex items-center gap-3">
            {step === 'configure' && (
              <Button
                onClick={() => setStep('prompt')}
                disabled={!formData.name}
                className="btn-primary"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {step === 'prompt' && (
              <>
                <Button
                  onClick={() => setStep('test')}
                  disabled={!formData.systemPrompt}
                  className="btn-secondary"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Test
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || !formData.systemPrompt}
                  className="btn-primary"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
            {step === 'test' && (
              <>
                <Button
                  onClick={handleTest}
                  disabled={isTesting || !testInput}
                  className="btn-secondary"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Test
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending}
                  className="btn-primary"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>

      <Sheet open={showResultPanel} onOpenChange={setShowResultPanel}>
        <SheetContent side="right" className="w-[500px] sm:max-w-[500px] bg-card border-border p-0 flex flex-col">
          <SheetHeader className="px-6 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <FlaskConical className="w-4 h-4 text-primary" />
                </div>
                <SheetTitle className="text-lg">Test Result</SheetTitle>
                {testResult && (
                  <div className="flex items-center gap-1.5 ml-2">
                    {testResult.latencyMs < 1000 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Zap className="w-3 h-3" />
                        {testResult.latencyMs}ms
                      </span>
                    ) : testResult.latencyMs < 3000 ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Clock className="w-3 h-3" />
                        {(testResult.latencyMs / 1000).toFixed(1)}s
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        <Clock className="w-3 h-3" />
                        {(testResult.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {testResult && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="text-muted-foreground/60">Tokens:</span>
                  <span className="font-medium text-foreground">{testResult.tokenUsage.total.toLocaleString()}</span>
                  <span className="text-muted-foreground/40">({testResult.tokenUsage.prompt} in / {testResult.tokenUsage.completion} out)</span>
                </div>
              </div>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-auto p-6">
            {isTesting ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Running test...
              </div>
            ) : testResult ? (
              <div className="editor-panel p-4 h-full overflow-auto">
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap break-words overflow-y-auto">
                  {typeof testResult.output === 'object'
                    ? JSON.stringify(testResult.output, null, 2)
                    : testResult.rawResponse}
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
    </Dialog>
  );
}

export const CreateAnalysisDialog = CreateAppDialog;
