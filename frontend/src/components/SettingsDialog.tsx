import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Key,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Server,
  Trash2,
  Zap,
  Database,
  Plus,
  Globe,
} from 'lucide-react';
import {
  getVendorKeyStatuses,
  setVendorKey,
  deleteVendorKey,
  getToolDefinitions,
  getToolInstanceStatuses,
  createToolInstance,
  deleteToolInstance,
  testToolInstanceConnection,
  getVendorsAndModels,
  type VendorKeyStatus,
  type Provider,
  type ToolDefinition,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { DynamicSchemaForm } from './DynamicSchemaForm';
import { getToolIconUrl } from '@/lib/tool-icons';

function getProviderLogoUrl(provider: Provider): string | null {
  switch (provider) {
    case 'openai':
      return '/openai.webp';
    case 'anthropic':
      return '/anthropic.webp';
    case 'gemini':
      return '/gemini.webp';
    default:
      return null;
  }
}

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

type SettingsTab = 'providers' | 'datasources';

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers');
  const queryClient = useQueryClient();

  const { data: keyStatuses = [], isLoading } = useQuery({
    queryKey: ['vendor-keys'],
    queryFn: getVendorKeyStatuses,
    enabled: open,
  });

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors-models'],
    queryFn: getVendorsAndModels,
    enabled: open,
  });

  const modelsByVendor = useMemo(() => {
    const result: Record<string, Array<{ id: string; displayName: string }>> = {};
    if (vendorsData?.modelsByVendor) {
      Object.assign(result, vendorsData.modelsByVendor);
    }
    keyStatuses.forEach((status) => {
      if (!result[status.vendor]) {
        result[status.vendor] = [];
      }
    });
    return result;
  }, [vendorsData, keyStatuses]);

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['vendor-keys'] });
    queryClient.invalidateQueries({ queryKey: ['vendor-key-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['providers'] });
    queryClient.invalidateQueries({ queryKey: ['vendors-models'] });
  };

  const invalidateToolQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['tool-definitions'] });
    queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
    queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-background/80 backdrop-blur-xl border-border/50 max-h-[85vh] overflow-y-auto shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">Settings</DialogTitle>
              <DialogDescription className="text-base">
                Configure model providers and data sources
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-1 border-b border-border/50 mb-6">
          <button
            onClick={() => setActiveTab('providers')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === 'providers'
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Key className="w-4 h-4" />
            Model Providers
          </button>
          <button
            onClick={() => setActiveTab('datasources')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === 'datasources'
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Database className="w-4 h-4" />
            Data Sources
          </button>
        </div>

        {activeTab === 'providers' ? (
          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <p>Loading providers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {keyStatuses.map((status) => (
                  <VendorKeyCard
                    key={status.vendor}
                    status={status}
                    models={modelsByVendor[status.vendor] ?? []}
                    onUpdate={invalidateQueries}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <DataSourcesSection
            enabled={open && activeTab === 'datasources'}
            onUpdate={invalidateToolQueries}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface VendorKeyCardProps {
  status: VendorKeyStatus;
  models: Array<{ id: string; displayName: string }>;
  onUpdate: () => void;
}

function VendorKeyCard({ status, models, onUpdate }: VendorKeyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (apiKey: string) => setVendorKey(status.vendor, apiKey),
    onSuccess: () => {
      toast.success(`${getProviderDisplayName(status.vendor)} API key saved`);
      setIsEditing(false);
      setNewKey('');
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVendorKey(status.vendor),
    onSuccess: () => {
      toast.success(`${getProviderDisplayName(status.vendor)} API key removed`);
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    if (!newKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }
    saveMutation.mutate(newKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newKey.trim()) {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setNewKey('');
    }
  };

  const isConfigured = status.configured;
  const logoUrl = getProviderLogoUrl(status.vendor);

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border transition-all duration-300 flex flex-col h-full",
        isEditing 
          ? "border-primary/20 ring-1 ring-primary/10 bg-secondary/10" 
          : "border-border/50 bg-secondary/5 hover:border-border hover:bg-secondary/10 hover:shadow-lg hover:shadow-black/5"
      )}
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          {logoUrl ? (
            <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-border/30 flex items-center justify-center p-1.5">
              <img 
                src={logoUrl} 
                alt={getProviderDisplayName(status.vendor)}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="p-2.5 bg-background rounded-lg shadow-sm border border-border/50">
              <Server className="w-6 h-6" />
            </div>
          )}
          {isConfigured && (
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
             </span>
          )}
        </div>

        <div className="space-y-1 mb-4">
           <h3 className="font-semibold text-lg">{getProviderDisplayName(status.vendor)}</h3>
           <p className="text-xs text-muted-foreground">
             {models.length > 0 
               ? models.map(m => m.displayName).join(', ')
               : 'No models available'}
           </p>
        </div>

        <div className="mt-auto pt-4 border-t border-border/30">
           {isConfigured && !isEditing ? (
             <div className="space-y-3">
               <div className="flex items-center gap-2">
                 <Badge variant="outline" className="bg-emerald-500/5 text-emerald-500 border-emerald-500/20 font-normal">
                   <Check className="w-3 h-3 mr-1" />
                   Connected
                 </Badge>
                 <span className="text-xs font-mono text-muted-foreground ml-auto bg-background/50 px-1.5 py-0.5 rounded">
                   {status.maskedKey}
                 </span>
               </div>
               
               <div className="flex items-center gap-2 w-full">
                  <Button
                   variant="outline"
                   size="sm"
                   className="flex-1 h-8 text-xs bg-transparent border-border/60 hover:bg-background/80"
                   onClick={() => setIsEditing(true)}
                 >
                   Update Key
                 </Button>
                 {status.source === 'database' && (
                    <Button
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                     onClick={() => deleteMutation.mutate()}
                     disabled={deleteMutation.isPending}
                   >
                     {deleteMutation.isPending ? (
                       <Loader2 className="w-3 h-3 animate-spin" />
                     ) : (
                       <Trash2 className="w-3 h-3" />
                     )}
                   </Button>
                 )}
               </div>
             </div>
           ) : (
             <div className="space-y-3">
                {!isEditing && (
                   <Button 
                     size="sm" 
                     className="w-full bg-primary/90 hover:bg-primary shadow-sm"
                     onClick={() => setIsEditing(true)}
                   >
                     Connect
                   </Button>
                )}
             </div>
           )}

           {(isEditing || (!isConfigured && isEditing)) && (
             <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
               <div className="relative">
                 <Input
                   type={showKey ? 'text' : 'password'}
                   placeholder="sk-..."
                   value={newKey}
                   onChange={(e) => setNewKey(e.target.value)}
                   onKeyDown={handleKeyDown}
                   className="pr-9 font-mono text-xs bg-background/80 h-9"
                   autoFocus
                 />
                 <Button
                   variant="ghost"
                   size="icon"
                   type="button"
                   className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                   onClick={() => setShowKey(!showKey)}
                 >
                   {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                 </Button>
               </div>
               
               <div className="flex gap-2">
                 <Button
                   variant="ghost"
                   size="sm"
                   className="flex-1 h-8 text-xs"
                   onClick={() => {
                     setIsEditing(false);
                     setNewKey('');
                   }}
                 >
                   Cancel
                 </Button>
                 <Button
                   size="sm"
                   className="flex-1 h-8 text-xs"
                   onClick={handleSave}
                   disabled={saveMutation.isPending || !newKey.trim()}
                 >
                   {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                 </Button>
               </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function getProviderDisplayName(provider: Provider): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic';
    case 'gemini':
      return 'Google';
    default:
      return provider;
  }
}


interface DataSourcesSectionProps {
  enabled: boolean;
  onUpdate: () => void;
}

const DATASOURCE_TOOLS = ['snowflake', 'postgres'];

function DataSourcesSection({ enabled, onUpdate }: DataSourcesSectionProps) {
  const [configuringTool, setConfiguringTool] = useState<ToolDefinition | null>(null);
  const [connectionName, setConnectionName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: definitions = [], isLoading: loadingDefinitions } = useQuery({
    queryKey: ['tool-definitions'],
    queryFn: getToolDefinitions,
    enabled,
  });

  const { data: instances = [], isLoading: loadingInstances } = useQuery({
    queryKey: ['tool-instance-statuses'],
    queryFn: getToolInstanceStatuses,
    enabled,
  });

  const datasourceDefinitions = definitions.filter(def => DATASOURCE_TOOLS.includes(def.name));
  const datasourceInstances = instances.filter(inst => {
    const def = definitions.find(d => d.id === inst.toolDefinitionId);
    return def && DATASOURCE_TOOLS.includes(def.name);
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createToolInstance({
        toolDefinitionId: configuringTool!.id,
        name: connectionName,
        config,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
      toast.success(`${configuringTool!.displayName} connection created`);
      handleCancelConfigure();
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteToolInstance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
      toast.success('Connection deleted');
      onUpdate();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const instance = await createToolInstance({
        toolDefinitionId: configuringTool!.id,
        name: `_test_${Date.now()}`,
        config,
      });
      try {
        const result = await testToolInstanceConnection(instance.id);
        await fetch(`/api/v1/tool-instances/${instance.id}`, { method: 'DELETE' });
        return result;
      } catch (error) {
        await fetch(`/api/v1/tool-instances/${instance.id}`, { method: 'DELETE' });
        throw error;
      }
    },
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, error: error.message });
      toast.error(error.message);
    },
  });

  const handleStartConfigure = (def: ToolDefinition) => {
    setConfiguringTool(def);
    setConnectionName(`My ${def.displayName}`);
    const defaultConfig: Record<string, unknown> = {};
    Object.entries(def.configSchema.properties).forEach(([key, prop]) => {
      if (prop.default !== undefined) {
        defaultConfig[key] = prop.default;
      }
    });
    setConfig(defaultConfig);
    setTestResult(null);
  };

  const handleCancelConfigure = () => {
    setConfiguringTool(null);
    setConnectionName('');
    setConfig({});
    setTestResult(null);
  };

  const handleConfigChange = (newValues: Record<string, unknown>) => {
    setConfig(newValues);
    setTestResult(null);
  };

  const isLoading = loadingDefinitions || loadingInstances;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        <p>Loading data sources...</p>
      </div>
    );
  }

  if (configuringTool) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-border/50">
          <Button variant="ghost" size="sm" onClick={handleCancelConfigure} className="h-8 px-2">
            ← Back
          </Button>
          {getToolIconUrl(configuringTool.name) ? (
            <div className="w-8 h-8 rounded-md bg-white shadow-sm border border-border/30 flex items-center justify-center p-1">
              <img
                src={getToolIconUrl(configuringTool.name)!}
                alt={configuringTool.displayName}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
              <Database className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-medium">Add {configuringTool.displayName} Connection</h3>
            <p className="text-xs text-muted-foreground">Configure your connection details</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="ds-conn-name" className="text-xs">Connection Name</Label>
            <Input
              id="ds-conn-name"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
              placeholder="My Connection"
              className="mt-1.5 h-9"
            />
          </div>

          <div>
            <Label className="text-xs mb-3 block">Connection Settings</Label>
            <DynamicSchemaForm
              schema={configuringTool.configSchema}
              values={config}
              onChange={handleConfigChange}
            />
          </div>

          {testResult && (
            <div
              className={cn(
                'p-3 rounded-lg border text-sm',
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  : 'bg-red-500/10 border-red-500/30 text-red-600'
              )}
            >
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Database className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {testResult.success ? 'Connection successful!' : 'Connection failed'}
                </span>
              </div>
              {testResult.error && (
                <p className="text-xs mt-1 opacity-80">{testResult.error}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !connectionName}
              className="flex-1"
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Test Connection
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !connectionName}
              className="flex-1"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Save Connection
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Configure global database connections that can be used across all your apps.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {datasourceDefinitions.map((def) => {
          const defInstances = datasourceInstances.filter(inst => inst.toolDefinitionId === def.id);
          const isConfigured = defInstances.length > 0;

          return (
            <div
              key={def.id}
              className={cn(
                "relative overflow-hidden rounded-xl border transition-all duration-300 flex flex-col",
                "border-border/50 bg-secondary/5 hover:border-border hover:bg-secondary/10 hover:shadow-lg hover:shadow-black/5"
              )}
            >
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  {getToolIconUrl(def.name) ? (
                    <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-border/30 flex items-center justify-center p-1.5">
                      <img
                        src={getToolIconUrl(def.name)!}
                        alt={def.displayName}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="p-2.5 bg-background rounded-lg shadow-sm border border-border/50">
                      {def.category === 'http' ? (
                        <Globe className="w-6 h-6 text-green-500" />
                      ) : (
                        <Database className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                  )}
                  {isConfigured && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="font-semibold text-lg">{def.displayName}</h3>
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                </div>

                <div className="mt-auto pt-4 border-t border-border/30">
                  {isConfigured ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        {defInstances.map((inst) => (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between text-xs bg-background/50 rounded-md px-2 py-1.5"
                          >
                            <span className="font-medium truncate">{inst.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                              onClick={() => deleteMutation.mutate(inst.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs bg-transparent border-border/60 hover:bg-background/80"
                        onClick={() => handleStartConfigure(def)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Connection
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full bg-primary/90 hover:bg-primary shadow-sm"
                      onClick={() => handleStartConfigure(def)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Connection
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {datasourceDefinitions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No data source tools available</p>
          <p className="text-sm">Data source tool definitions are not configured.</p>
        </div>
      )}
    </div>
  );
}
