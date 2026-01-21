import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
  Database,
  Globe,
  HardDrive,
  Puzzle,
  Search,
  Plus,
  Loader2,
  ChevronRight,
  Check,
  Zap,
  Play,
  Code2,
} from 'lucide-react';
import {
  getToolDefinitions,
  getToolInstanceStatuses,
  createToolInstance,
  testToolInstanceConnection,
  testToolInstanceQuery,
  upsertAppToolUsage,
  type ToolDefinition,
  type ToolInstanceStatus,
  type ToolCategory,
} from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { DynamicSchemaForm } from './DynamicSchemaForm';
import { getToolIconUrl } from '@/lib/tool-icons';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const AUTH_TYPES = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api_key', label: 'API Key' },
] as const;

const getDefaultAuthHeaderName = (type: string) =>
  type === 'api_key' ? 'X-API-Key' : 'Authorization';

const CATEGORY_CONFIG: Record<ToolCategory, { label: string; icon: typeof Database; color: string }> = {
  database: { label: 'Databases', icon: Database, color: 'text-blue-500' },
  http: { label: 'HTTP / APIs', icon: Globe, color: 'text-green-500' },
  storage: { label: 'Storage', icon: HardDrive, color: 'text-purple-500' },
  custom: { label: 'Custom', icon: Puzzle, color: 'text-orange-500' },
};

interface ToolCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstanceCreated?: (instanceId: string) => void;
  appId?: string;
}

type Step = 'catalog' | 'configure' | 'configure-query';

export function ToolCatalogDialog({
  open,
  onOpenChange,
  onInstanceCreated,
  appId,
}: ToolCatalogDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [step, setStep] = useState<Step>('catalog');
  const [selectedDefinition, setSelectedDefinition] = useState<ToolDefinition | null>(null);
  const [connectionName, setConnectionName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; data?: unknown } | null>(null);
  const [httpMethod, setHttpMethod] = useState('GET');
  const [httpUrl, setHttpUrl] = useState('');
  const [httpAuthType, setHttpAuthType] = useState('none');
  const [httpAuthHeaderName, setHttpAuthHeaderName] = useState('Authorization');
  const [httpAuthToken, setHttpAuthToken] = useState('');
  const [httpBody, setHttpBody] = useState('');
  const prevAuthTypeRef = useRef(httpAuthType);

  const [selectedInstance, setSelectedInstance] = useState<ToolInstanceStatus | null>(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryTestResult, setQueryTestResult] = useState<{ success: boolean; error?: string; data?: unknown; rowCount?: number } | null>(null);

  const queryClient = useQueryClient();

  const { data: definitions = [], isLoading: loadingDefinitions } = useQuery({
    queryKey: ['tool-definitions'],
    queryFn: getToolDefinitions,
    enabled: open,
  });

  const { data: instances = [] } = useQuery({
    queryKey: ['tool-instance-statuses'],
    queryFn: getToolInstanceStatuses,
    enabled: open,
  });

  const instancesByDefinition = instances.reduce((acc, instance) => {
    if (!acc[instance.toolDefinitionId]) {
      acc[instance.toolDefinitionId] = [];
    }
    acc[instance.toolDefinitionId].push(instance);
    return acc;
  }, {} as Record<string, ToolInstanceStatus[]>);

  const DATABASE_TOOLS = ['snowflake', 'postgres', 'mysql'];

  const filteredDefinitions = definitions.filter((def) => {
      if (DATABASE_TOOLS.includes(def.name) || def.category === 'database') return false;

      const matchesSearch =
        searchQuery === '' ||
        def.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        def.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });

  const databaseInstances = instances.filter((inst) => {
    const matchesSearch =
      searchQuery === '' ||
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    return DATABASE_TOOLS.includes(inst.definitionName) && matchesSearch;
  });

  const toolsByCategory = filteredDefinitions.reduce((acc, def) => {
    if (!acc[def.category]) {
      acc[def.category] = [];
    }
    acc[def.category].push(def);
    return acc;
  }, {} as Record<ToolCategory, ToolDefinition[]>);


  const isHttpTool = selectedDefinition?.name === 'http';
  
  const getResponseDisplay = () => {
    if (!testResult?.data) {
      return { language: 'json' as const, value: '{}' };
    }
    
    if (typeof testResult.data === 'object' && 'response' in testResult.data) {
      const responsePayload = testResult.data as { response?: { data?: unknown; rawBody?: string } };
      const responseData = responsePayload?.response?.data;
      const rawBody = responsePayload?.response?.rawBody;
      
      if (responseData !== undefined && responseData !== null) {
        if (typeof responseData === 'object') {
          return { 
            language: 'json' as const, 
            value: JSON.stringify(responseData, null, 2) 
          };
        }
        if (typeof responseData === 'string' && responseData.length > 0) {
          const isHtml = responseData.trim().startsWith('<');
          const language = isHtml ? 'html' : 'plaintext';
          return { language, value: responseData };
        }
      }
      
      if (typeof rawBody === 'string' && rawBody.length > 0) {
        const isHtml = rawBody.trim().startsWith('<');
        const language = isHtml ? 'html' : 'plaintext';
        return { language, value: rawBody };
      }
    }
    
    if (typeof testResult.data === 'string' && testResult.data.length > 0) {
      const isHtml = testResult.data.trim().startsWith('<');
      const language = isHtml ? 'html' : 'plaintext';
      return { language, value: testResult.data };
    }
    
    return { 
      language: 'json' as const, 
      value: JSON.stringify(testResult.data, null, 2) 
    };
  };
  
  const responseDisplay = getResponseDisplay();
  const authHeaderDefault = getDefaultAuthHeaderName(httpAuthType);
  const authPrefix = httpAuthType === 'bearer' ? 'Bearer' : httpAuthType === 'basic' ? 'Basic' : '';
  const authTokenLabel =
    httpAuthType === 'bearer'
      ? 'Bearer Token'
      : httpAuthType === 'basic'
      ? 'Basic Token'
      : 'API Key';

  const normalizeAuthToken = (value: string) => {
    if (httpAuthType === 'bearer') {
      return value.replace(/^Bearer\s+/i, '');
    }
    if (httpAuthType === 'basic') {
      return value.replace(/^Basic\s+/i, '');
    }
    return value;
  };

  useEffect(() => {
    const prev = prevAuthTypeRef.current;
    if (prev !== httpAuthType) {
      const prevDefault = getDefaultAuthHeaderName(prev);
      const nextDefault = getDefaultAuthHeaderName(httpAuthType);
      if (!httpAuthHeaderName || httpAuthHeaderName === prevDefault) {
        setHttpAuthHeaderName(nextDefault);
      }
      prevAuthTypeRef.current = httpAuthType;
    }
  }, [httpAuthType, httpAuthHeaderName]);

  const getConfigForSubmit = () => {
    if (isHttpTool) {
      return {
        method: httpMethod,
        url: httpUrl,
        authType: httpAuthType,
        authHeaderName: httpAuthType !== 'none' ? (httpAuthHeaderName || authHeaderDefault) : undefined,
        authToken: httpAuthType !== 'none' ? normalizeAuthToken(httpAuthToken) : undefined,
        body: ['POST', 'PUT', 'PATCH'].includes(httpMethod) ? (httpBody || undefined) : undefined,
      };
    }
    return config;
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createToolInstance({
        toolDefinitionId: selectedDefinition!.id,
        name: connectionName,
        config: getConfigForSubmit(),
      }),
    onSuccess: (instance) => {
      queryClient.invalidateQueries({ queryKey: ['tool-instances'] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
      toast.success(`${selectedDefinition!.displayName} connection created`);
      onInstanceCreated?.(instance.id);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const instance = await createToolInstance({
        toolDefinitionId: selectedDefinition!.id,
        name: `_test_${Date.now()}`,
        config: getConfigForSubmit(),
      });
      try {
        const result = isHttpTool
          ? await testToolInstanceQuery(instance.id, {})
          : await testToolInstanceConnection(instance.id);
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
        toast.success(isHttpTool ? 'Request successful!' : 'Connection test successful!');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, error: error.message });
      toast.error(error.message);
    },
  });

  const testQueryMutation = useMutation({
    mutationFn: async () => {
      return testToolInstanceQuery(selectedInstance!.id, { query: sqlQuery });
    },
    onSuccess: (result) => {
      setQueryTestResult(result);
      if (result.success) {
        toast.success(`Query executed successfully! ${result.rowCount !== undefined ? `${result.rowCount} row(s) returned` : ''}`);
      } else {
        toast.error(result.error || 'Query failed');
      }
    },
    onError: (error: Error) => {
      setQueryTestResult({ success: false, error: error.message });
      toast.error(error.message);
    },
  });

  const addDatabaseToolMutation = useMutation({
    mutationFn: async () => {
      if (!appId) throw new Error('App ID is required');
      return upsertAppToolUsage(appId, selectedInstance!.id, {
        enabled: true,
        usageConfig: { query: sqlQuery },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-tool-usages', appId] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
      toast.success(`${selectedInstance!.displayName} added to app`);
      handleClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetHttpState = () => {
    setHttpMethod('GET');
    setHttpUrl('');
    setHttpAuthType('none');
    setHttpAuthHeaderName('Authorization');
    setHttpAuthToken('');
    setHttpBody('');
  };

  const handleSelectDefinition = (def: ToolDefinition) => {
    setSelectedDefinition(def);
    setConnectionName(`My ${def.displayName}`);
    setConfig({});
    setTestResult(null);
    resetHttpState();
    setStep('configure');
  };

  const handleSelectDatabaseInstance = (instance: ToolInstanceStatus) => {
    setSelectedInstance(instance);
    setSqlQuery('');
    setQueryTestResult(null);
    setStep('configure-query');
  };

  const handleBack = () => {
    setStep('catalog');
    setSelectedDefinition(null);
    setSelectedInstance(null);
    setConnectionName('');
    setConfig({});
    setTestResult(null);
    setSqlQuery('');
    setQueryTestResult(null);
    resetHttpState();
  };

  const handleClose = () => {
    setStep('catalog');
    setSelectedDefinition(null);
    setSelectedInstance(null);
    setConnectionName('');
    setConfig({});
    setTestResult(null);
    setSearchQuery('');
    setSqlQuery('');
    setQueryTestResult(null);
    resetHttpState();
    onOpenChange(false);
  };

  const handleConfigChange = (newValues: Record<string, unknown>) => {
    setConfig(newValues);
    setTestResult(null);
  };

  const renderDefinitionItem = (def: ToolDefinition) => {
    const defInstances = instancesByDefinition[def.id] || [];
    return (
      <button
        key={def.id}
        onClick={() => handleSelectDefinition(def)}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/50 hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group"
      >
        {getToolIconUrl(def.name) ? (
          <div className="w-9 h-9 rounded-md bg-white shadow-sm border border-border/30 flex items-center justify-center p-1.5 flex-shrink-0">
            <img
              src={getToolIconUrl(def.name)!}
              alt={def.displayName}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
            <Puzzle className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{def.displayName}</span>
            {defInstances.length > 0 && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {defInstances.length} configured
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {def.description}
          </p>
        </div>
        <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        {step === 'configure-query' ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </Button>
                {getToolIconUrl(selectedInstance?.definitionName) ? (
                  <div className="w-8 h-8 rounded-md bg-white shadow-sm border border-border/30 flex items-center justify-center p-1">
                    <img
                      src={getToolIconUrl(selectedInstance?.definitionName)!}
                      alt={selectedInstance?.displayName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                    <Database className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-base">
                    Configure {selectedInstance?.name}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Write and test your SQL query
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-4">
                <div className="rounded-lg border border-border/60 overflow-hidden shadow-inner bg-[#1e1e1e]">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">SQL Query</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
                      onClick={() => testQueryMutation.mutate()}
                      disabled={testQueryMutation.isPending || !sqlQuery.trim()}
                    >
                      {testQueryMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                      ) : (
                        <Play className="w-3 h-3 mr-1.5" />
                      )}
                      Run Test
                    </Button>
                  </div>

                  <Editor
                    height="200px"
                    language="sql"
                    theme="vs-dark"
                    value={sqlQuery}
                    onChange={(value) => {
                      setSqlQuery(value || '');
                      setQueryTestResult(null);
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      padding: { top: 12, bottom: 12 },
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  />
                </div>

                {queryTestResult && (
                  <div
                    className={cn(
                      'rounded-lg border overflow-hidden',
                      queryTestResult.success
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-inherit bg-inherit/50">
                      {queryTestResult.success ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Puzzle className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className={cn(
                        "text-[10px] font-medium uppercase tracking-wider",
                        queryTestResult.success ? "text-emerald-500" : "text-red-500"
                      )}>
                        {queryTestResult.success ? `Success${queryTestResult.rowCount !== undefined ? ` - ${queryTestResult.rowCount} row(s)` : ''}` : 'Error'}
                      </span>
                    </div>
                    
                    <div className="p-3 bg-black/20 max-h-[200px] overflow-y-auto">
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all text-muted-foreground">
                        {queryTestResult.success 
                          ? JSON.stringify(queryTestResult.data || 'Query executed successfully', null, 2)
                          : queryTestResult.error}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => testQueryMutation.mutate()}
                disabled={testQueryMutation.isPending || !sqlQuery.trim()}
                className="flex-1"
              >
                {testQueryMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Test Query
              </Button>
              <Button
                onClick={() => addDatabaseToolMutation.mutate()}
                disabled={addDatabaseToolMutation.isPending || !sqlQuery.trim() || !appId}
                className="flex-1"
              >
                {addDatabaseToolMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create
              </Button>
            </div>
          </>
        ) : step === 'catalog' ? (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle>Add Tool Connection</DialogTitle>
              <DialogDescription>
                Select a tool to configure (Data sources are in Settings)
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-4 pt-2">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 px-6 pb-6">
                {loadingDefinitions ? (
                    <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                   <div className="space-y-6">
                        {databaseInstances.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Database className={cn('w-4 h-4', CATEGORY_CONFIG.database.color)} />
                              <span className="text-sm font-medium">Data Sources</span>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                                from Settings
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              {databaseInstances.map((instance) => (
                                <button
                                  key={instance.id}
                                  onClick={() => handleSelectDatabaseInstance(instance)}
                                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card/50 hover:bg-secondary/50 hover:border-primary/30 transition-all text-left group"
                                >
                                  {getToolIconUrl(instance.definitionName) ? (
                                    <div className="w-9 h-9 rounded-md bg-white shadow-sm border border-border/30 flex items-center justify-center p-1.5 flex-shrink-0">
                                      <img
                                        src={getToolIconUrl(instance.definitionName)!}
                                        alt={instance.displayName}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                                      <Database className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm">{instance.name}</span>
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 opacity-60">
                                        {instance.displayName}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate">
                                      Configure query for this connection
                                    </p>
                                  </div>
                                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {filteredDefinitions.length === 0 && databaseInstances.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No tools found</p>
                                <p className="text-sm mt-1">Configure data sources in Settings first</p>
                            </div>
                        ) : (
                            Object.entries(CATEGORY_CONFIG).map(([category, cfg]) => {
                                if (category === 'database') return null;

                                const categoryDefs = toolsByCategory[category as ToolCategory] || [];
                                if (categoryDefs.length === 0) return null;
        
                                const Icon = cfg.icon;
                                return (
                                <div key={category}>
                                    <div className="flex items-center gap-2 mb-2">
                                    <Icon className={cn('w-4 h-4', cfg.color)} />
                                    <span className="text-sm font-medium">{cfg.label}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                    {categoryDefs.map(renderDefinitionItem)}
                                    </div>
                                </div>
                                );
                            })
                        )}
                   </div>
                )}
            </ScrollArea>
           
          </>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleBack} className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </Button>
                {getToolIconUrl(selectedDefinition?.name) ? (
                  <div className="w-8 h-8 rounded-md bg-white shadow-sm border border-border/30 flex items-center justify-center p-1">
                    <img
                      src={getToolIconUrl(selectedDefinition?.name)!}
                      alt={selectedDefinition?.displayName ?? ''}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                    <Puzzle className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <DialogTitle className="text-base">
                    Configure {selectedDefinition?.displayName}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Set up your connection details
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1">
              <div className="px-6 py-4 space-y-4">
                <div>
                  <Label htmlFor="conn-name" className="text-xs">Name *</Label>
                  <Input
                    id="conn-name"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    placeholder="My Connection"
                    className="mt-1.5 h-9"
                  />
                </div>

                {isHttpTool ? (
                  <>
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <div>
                        <Label htmlFor="http-method" className="text-xs">Method *</Label>
                        <Select value={httpMethod} onValueChange={setHttpMethod}>
                          <SelectTrigger className="mt-1.5 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {HTTP_METHODS.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="http-url" className="text-xs">URL *</Label>
                        <Input
                          id="http-url"
                          value={httpUrl}
                          onChange={(e) => setHttpUrl(e.target.value)}
                          placeholder="https://api.example.com/endpoint"
                          className="mt-1.5 h-9 font-mono text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="http-auth-type" className="text-xs">Authentication</Label>
                      <Select value={httpAuthType} onValueChange={setHttpAuthType}>
                        <SelectTrigger className="mt-1.5 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AUTH_TYPES.map((auth) => (
                            <SelectItem key={auth.value} value={auth.value}>
                              {auth.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {httpAuthType !== 'none' && (
                      <div className="space-y-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <div>
                          <Label htmlFor="http-auth-header" className="text-xs">Header Name</Label>
                          <Input
                            id="http-auth-header"
                            value={httpAuthHeaderName}
                            onChange={(e) => setHttpAuthHeaderName(e.target.value)}
                            placeholder={authHeaderDefault}
                            className="mt-1.5 h-9"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Header to send the token in (e.g., Authorization, X-API-Key)
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="http-auth-token" className="text-xs">{authTokenLabel} *</Label>
                          {authPrefix ? (
                            <div className="mt-1.5 flex items-center rounded-md border border-input bg-background">
                              <span className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground border-r border-input">
                                {authPrefix}
                              </span>
                              <Input
                                id="http-auth-token"
                                type="password"
                                value={httpAuthToken}
                                onChange={(e) => setHttpAuthToken(normalizeAuthToken(e.target.value))}
                                placeholder="Enter token"
                                className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm"
                              />
                            </div>
                          ) : (
                            <Input
                              id="http-auth-token"
                              type="password"
                              value={httpAuthToken}
                              onChange={(e) => setHttpAuthToken(normalizeAuthToken(e.target.value))}
                              placeholder="Enter API key"
                              className="mt-1.5 h-9 font-mono"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {['POST', 'PUT', 'PATCH'].includes(httpMethod) && (
                      <div className="rounded-lg border border-border/60 overflow-hidden bg-[#1e1e1e]">
                        <div className="px-3 py-1.5 bg-[#2d2d2d] border-b border-[#3d3d3d] text-[10px] font-medium text-muted-foreground">
                          Request Body (JSON)
                        </div>
                        <Editor
                          height="140px"
                          language="json"
                          theme="vs-dark"
                          value={httpBody}
                          onChange={(value) => setHttpBody(value || '')}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 12,
                            scrollBeyondLastLine: false,
                            wordWrap: 'on',
                            padding: { top: 8, bottom: 8 },
                            fontFamily: 'JetBrains Mono, monospace',
                            formatOnPaste: true,
                            formatOnType: true,
                          }}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  selectedDefinition && (
                    <div className="pt-2">
                      <Label className="text-xs mb-3 block">Connection Settings</Label>
                      <DynamicSchemaForm
                        schema={selectedDefinition.configSchema}
                        values={config}
                        onChange={handleConfigChange}
                      />
                    </div>
                  )
                )}

                {testResult && (
                  <div
                    className={cn(
                      'p-3 rounded-lg border text-sm max-h-[300px] overflow-y-auto',
                      testResult.success
                        ? 'bg-secondary/50 border-border/50 text-foreground'
                        : 'bg-red-500/10 border-red-500/30 text-red-600'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Puzzle className="w-4 h-4" />
                      )}
                      <span className="font-medium">
                        {testResult.success
                          ? (isHttpTool ? 'Request successful!' : 'Connection successful!')
                          : (isHttpTool ? 'Request failed' : 'Connection failed')}
                      </span>
                    </div>
                    {testResult.error && (
                      <p className="text-xs mt-1 opacity-80">{testResult.error}</p>
                    )}
                    {testResult.data !== undefined && (
                      <div className="mt-2 rounded-lg border border-border/60 overflow-hidden bg-muted/30">
                        <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 text-[10px] font-medium text-muted-foreground">
                          Response
                        </div>
                        <textarea
                          readOnly
                          value={responseDisplay.value}
                          className="w-full h-[200px] p-3 text-xs font-mono bg-transparent text-foreground resize-none focus:outline-none"
                          style={{ fontFamily: 'JetBrains Mono, monospace' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="px-6 py-4 border-t flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending || !connectionName || (isHttpTool && !httpUrl)}
                className="flex-1"
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Test
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !connectionName || (isHttpTool && !httpUrl)}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

