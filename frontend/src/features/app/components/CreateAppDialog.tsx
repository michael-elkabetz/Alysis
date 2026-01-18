import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Play,
  Save,
  Loader2,
  CheckCircle2,
  Copy,
  Sparkles,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import {
  getVendorsAndModels,
  getVendorKeyStatuses,
  createApp,
  type CreateAppDto,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TestResultSheet } from './TestResultSheet';
import { useTestRunner, generateInterfacesFromOutput } from '../hooks/useTestRunner';

interface CreateAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialValues?: {
    name: string;
    description: string;
    systemPrompt: string;
    vendor: string;
    model: string;
    sampleData?: string;
  };
}

export function CreateAppDialog({
  open,
  onOpenChange,
  onSuccess,
  initialValues,
}: CreateAppDialogProps) {
  const [step, setStep] = useState<'configure' | 'prompt' | 'test'>('configure');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    vendor: '',
    model: '',
  });
  const [savedApp, setSavedApp] = useState<{
    id: string;
    name: string;
    apiKey: { key: string };
    testOutput?: Record<string, unknown>;
    sampleData?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const {
    sampleData,
    setSampleData,
    testResult,
    isTesting,
    testStatus,
    isResultPanelOpen,
    setIsResultPanelOpen,
    runTest,
    clearResult,
  } = useTestRunner();

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-models'],
    queryFn: getVendorsAndModels,
  });

  const { data: vendorKeyStatuses } = useQuery({
    queryKey: ['vendor-key-statuses'],
    queryFn: getVendorKeyStatuses,
  });

  const vendors = vendorsData?.vendors ?? [];
  const modelsByVendor = vendorsData?.modelsByVendor ?? {};

  const configuredVendor = useMemo(() => {

    if (!vendorKeyStatuses || !vendors.length) return null;
    const configured = vendorKeyStatuses.find((v) => v.configured);
    if (!configured) return null;
    const vendor = vendors.find((v) => v.id === configured.vendor);
    return vendor || null;
  }, [vendorKeyStatuses, vendors]);

  const hasConfiguredVendor = configuredVendor !== null;

  useEffect(() => {
    if (initialValues) {
      setFormData({
        name: initialValues.name,
        description: initialValues.description,
        systemPrompt: initialValues.systemPrompt,
        vendor: initialValues.vendor,
        model: initialValues.model,
      });
      if (initialValues.sampleData) {
        setSampleData(initialValues.sampleData);
      }
      return;
    }

    if (!configuredVendor || !modelsByVendor[configuredVendor.id]) return;
    
    const models = modelsByVendor[configuredVendor.id];
    const defaultModel = models?.[0]?.id || '';
    
    setFormData((prev) => {
      if (prev.vendor && prev.vendor !== '' && vendors.some((v) => v.id === prev.vendor)) {
        return prev;
      }
      return {
        ...prev,
        vendor: configuredVendor.id,
        model: defaultModel,
      };
    });
  }, [configuredVendor, modelsByVendor, vendors, initialValues]);

  useEffect(() => {
    const vendorModels = modelsByVendor[formData.vendor];
    if (vendorModels && vendorModels.length > 0 && !vendorModels.some((m) => m.id === formData.model)) {
      setFormData((prev) => ({ ...prev, model: vendorModels[0].id }));
    }
  }, [formData.vendor, formData.model, modelsByVendor]);


  const createMutation = useMutation({
    mutationFn: (dto: CreateAppDto & { _testOutput?: Record<string, unknown>; _sampleData?: string }) => createApp(dto),
    onSuccess: (response, variables) => {
      setSavedApp({
        id: response.id,
        name: response.name,
        apiKey: response.apiKey,
        testOutput: variables._testOutput,
        sampleData: variables._sampleData,
      });
      toast.success('App created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleTest = () => {
    runTest({
      systemPrompt: formData.systemPrompt,
      vendor: formData.vendor as 'openai' | 'anthropic' | 'gemini',
      model: formData.model,
    });
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a name');
      return;
    }
    if (!formData.systemPrompt.trim()) {
      toast.error('Please enter analysis instructions');
      return;
    }
    const generatedInterfaces = testResult?.output ? generateInterfacesFromOutput(testResult.output) : undefined;
    const dto: CreateAppDto & { _testOutput?: Record<string, unknown>; _sampleData?: string } = {
      name: formData.name,
      description: formData.description || undefined,
      systemPrompt: formData.systemPrompt,
      interfaces: generatedInterfaces,
      vendor: formData.vendor as 'openai' | 'anthropic' | 'gemini',
      model: formData.model,
      sampleData: sampleData || undefined,
      _testOutput: testResult?.output,
      _sampleData: sampleData || undefined,
    };
    createMutation.mutate(dto);
  };

  const copyApiKey = () => {
    if (savedApp?.apiKey.key) {
      navigator.clipboard.writeText(savedApp.apiKey.key);
      setCopied(true);
      toast.success('API key copied');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getEndpointUrl = () => {
    if (!savedApp) return '';
    return `${window.location.origin}/api/v1/analyze/${savedApp.id}`;
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
    if (savedApp) {
      onSuccess();
    }
    setStep('configure');
    setFormData({
      name: '',
      description: '',
      systemPrompt: '',
      vendor: configuredVendor?.id || '',
      model: configuredVendor ? (modelsByVendor[configuredVendor.id]?.[0]?.id || '') : '',
    });
    setSampleData('');
    clearResult();
    setSavedApp(null);
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
    if (!savedApp) return '';
    
    const inputData = savedApp.sampleData 
      ? JSON.stringify({ input: { data: savedApp.sampleData } })
      : '{"input": {"data": "your data here"}}';
    
    const escapedData = inputData.replace(/'/g, "'\\''");
    
    return `curl -X POST "${window.location.origin}/api/v1/analyze/${savedApp.id}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${savedApp.apiKey.key}" \\
  -d '${escapedData}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    toast.success('cURL command copied');
  };

  if (savedApp) {
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
                {savedApp.name}
              </p>
              <p className="text-sm text-muted-foreground font-mono break-all">
                {savedApp.id}
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
                {savedApp.apiKey.key}
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
      <DialogContent className="max-w-4xl h-[700px] p-0 flex flex-col bg-card border-border">
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
                  else if (i === 1 && formData.name && formData.vendor && formData.model) setStep('prompt');
                  else if (i === 2 && formData.name && formData.vendor && formData.model && formData.systemPrompt) setStep('test');
                }}
                disabled={
                  (i === 1 && (!formData.name || !formData.vendor || !formData.model)) ||
                  (i === 2 && (!formData.name || !formData.vendor || !formData.model || !formData.systemPrompt)) ||
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

        <div className={cn("flex-1 px-6 py-6", step === 'test' ? "overflow-y-auto" : "overflow-y-auto")}>
          {step === 'configure' && (
            <div className="h-full flex flex-col">
              <div className="space-y-5 overflow-visible pb-2">
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

                <div className="grid grid-cols-2 gap-4 pb-1">
                  <div className="space-y-2">
                    <Label className="text-sm">Provider</Label>
                    <Select
                      value={formData.vendor}
                      onValueChange={(v) => setFormData({ ...formData, vendor: v })}
                      disabled={!hasConfiguredVendor}
                    >
                      <SelectTrigger className="input-modern !bg-[#f5f0e8]">
                        <SelectValue placeholder={hasConfiguredVendor ? "Select provider" : "No vendor configured"} />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {vendors.filter((vendor) => 
                          vendorKeyStatuses?.some((v) => v.vendor === vendor.id && v.configured)
                        ).map((vendor) => (
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
                      disabled={!hasConfiguredVendor || !formData.vendor}
                    >
                      <SelectTrigger className="input-modern !bg-[#f5f0e8]">
                        <SelectValue placeholder={hasConfiguredVendor ? "Select model" : "No model available"} />
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

                {!hasConfiguredVendor && vendorKeyStatuses && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>No vendor configured. Please add an API key in settings.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'prompt' && (
            <div className="space-y-3 h-full flex flex-col">
              <Label htmlFor="systemPrompt" className="text-sm">Analysis Instructions</Label>
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
              <Label htmlFor="sampleData" className="text-sm mb-2">Sample Data</Label>
              <Textarea
                id="sampleData"
                className="input-modern flex-1 resize-none font-mono text-sm !bg-[#f5f0e8] !border-0"
                placeholder="Paste or type your sample data..."
                value={sampleData}
                onChange={(e) => setSampleData(e.target.value)}
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
                disabled={!formData.name || !formData.vendor || !formData.model}
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
                  disabled={isTesting || !sampleData}
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

      <TestResultSheet
        isOpen={isResultPanelOpen}
        onOpenChange={setIsResultPanelOpen}
        isLoading={isTesting}
        testStatus={testStatus}
        result={testResult}
      />
    </Dialog>
  );
}
