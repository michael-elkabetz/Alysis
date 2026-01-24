import { useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Editor from '@monaco-editor/react';
import {
  Play,
  Loader2,
  Check,
  Code2,
  Save,
  Terminal,
  Plus,
  Puzzle,
  Globe,
  Database,
  Trash2,
  Wrench,
  Pencil,
} from 'lucide-react';
import {
  getToolInstanceStatuses,
  getAppToolUsages,
  upsertAppToolUsage,
  updateAppToolUsage,
  deleteAppToolUsage,
  executeAppToolUsage,
  getToolInstance,
  type ToolInstanceStatus,
  type AppToolUsageV2,
  type JsonSchema,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ToolCatalogDialog } from '@/components/ToolCatalogDialog';
import { getToolIconUrl } from '@/lib/tool-icons';

interface ToolUsagePanelProps {
  appId: string;
}

interface ToolTestResult {
  success: boolean;
  rowCount?: number;
  data?: unknown;
  error?: string;
}

export function ToolUsagePanel({ appId }: ToolUsagePanelProps) {
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: availableInstances = [] } = useQuery({
    queryKey: ['tool-instance-statuses'],
    queryFn: getToolInstanceStatuses,
  });

  const { data: appToolUsages = [], isLoading: loadingUsages } = useQuery({
    queryKey: ['app-tool-usages', appId],
    queryFn: () => getAppToolUsages(appId),
  });

  const attachMutation = useMutation({
    mutationFn: (instanceId: string) =>
      upsertAppToolUsage(appId, instanceId, { enabled: true, usageConfig: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-tool-usages', appId] });
      queryClient.invalidateQueries({ queryKey: ['tool-instance-statuses'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleInstanceCreated = (instanceId: string) => {
    attachMutation.mutate(instanceId);
  };

  const appInstances = appToolUsages.map((usage) => {
    const instance = availableInstances.find((item) => item.id === usage.toolInstanceId);
    const fallbackInstance: ToolInstanceStatus = {
      id: usage.toolInstanceId,
      name: usage.instance.name,
      toolDefinitionId: usage.definition.id,
      definitionName: usage.definition.name,
      displayName: usage.definition.displayName,
      category: usage.definition.category,
      executorType: usage.definition.executorType,
      configured: true,
      maskedConfig: {},
      updatedAt: usage.updatedAt,
    };

    return {
      instance: instance ?? fallbackInstance,
      usage,
    };
  });

  if (loadingUsages) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
        <p className="text-sm">Loading tools...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Tools</span>
          {appToolUsages.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {appToolUsages.length} configured
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCatalogDialogOpen(true)}
          className="h-7 text-xs gap-1.5"
        >
          <Plus className="w-3 h-3" />
          Add Tool
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {appInstances.map(({ instance, usage }) => (
          <ToolUsageCard 
            key={instance.id} 
            appId={appId} 
            instance={instance} 
            usage={usage}
            usageSchema={usage.definition.usageSchema}
          />
        ))}

        {appInstances.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border/60 rounded-xl bg-secondary/5">
            <Puzzle className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tools configured</p>
            <p className="text-sm mb-4">
              Add an HTTP request or other tool connection
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCatalogDialogOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Tool
            </Button>
          </div>
        )}
      </div>

      <ToolCatalogDialog
        open={catalogDialogOpen}
        onOpenChange={setCatalogDialogOpen}
        onInstanceCreated={handleInstanceCreated}
        appId={appId}
      />
    </div>
  );
}

interface ToolUsageCardProps {
  appId: string;
  instance: ToolInstanceStatus;
  usage?: AppToolUsageV2;
  usageSchema?: JsonSchema;
}

function ToolUsageCard({ appId, instance, usage, usageSchema }: ToolUsageCardProps) {
  const [usageConfig, setUsageConfig] = useState<Record<string, unknown>>(
    usage?.usageConfig || {}
  );
  const [testResult, setTestResult] = useState<ToolTestResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [instanceConfig, setInstanceConfig] = useState<Record<string, unknown> | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (usage) {
      setUsageConfig(usage.usageConfig);
    }
  }, [usage]);

  useEffect(() => {
    if (isEditing && instance.executorType === 'http' && instance.id && !instanceConfig) {
      getToolInstance(instance.id)
        .then((fullInstance) => {
          setInstanceConfig(fullInstance.config);
          const populatedConfig: Record<string, unknown> = { ...usage?.usageConfig || {} };
          
          if (fullInstance.config.url && !populatedConfig.endpoint) {
            populatedConfig.endpoint = fullInstance.config.url;
          }
          
          if (fullInstance.config.method && !populatedConfig.method) {
            populatedConfig.method = fullInstance.config.method;
          }
          if (fullInstance.config.body !== undefined && populatedConfig.body === undefined) {
            populatedConfig.body = fullInstance.config.body;
          }
          if (fullInstance.config.authType && !populatedConfig.authType) {
            populatedConfig.authType = fullInstance.config.authType;
          }
          if (fullInstance.config.authToken && !populatedConfig.authToken) {
            populatedConfig.authToken = fullInstance.config.authToken;
          }
          if (fullInstance.config.authHeaderName && !populatedConfig.authHeaderName) {
            populatedConfig.authHeaderName = fullInstance.config.authHeaderName;
          }
          
          setUsageConfig(populatedConfig);
        })
        .catch((error) => {
          console.error('Failed to fetch instance config:', error);
        });
    } else if (!isEditing) {
      setInstanceConfig(null);
    }
  }, [isEditing, instance.executorType, instance.id, instanceConfig, usage]);

  const updateMutation = useMutation({
    mutationFn: (config: Record<string, unknown>) =>
      updateAppToolUsage(appId, usage!.id, { usageConfig: config }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-tool-usages', appId] });
      toast.success('Configuration saved');
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteUsageMutation = useMutation({
    mutationFn: () => deleteAppToolUsage(appId, usage!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-tool-usages', appId] });
      toast.success('Tool removed from app');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: () => executeAppToolUsage(appId, usage!.id, usageConfig),
    onSuccess: (result) => {
      setTestResult({
        success: result.success,
        error: result.error,
        data: result.data,
      });
      if (result.success) {
        toast.success(`Request successful`);
      } else {
        toast.error(result.error || 'Request failed');
      }
    },
    onError: (error: Error) => {
      setTestResult({ success: false, error: error.message });
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(usageConfig);
  };

  const handleEdit = () => {
    if (isEditing) {
      handleCancelEdit();
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (usage) {
      setUsageConfig(usage.usageConfig);
    }
    setInstanceConfig(null);
    setIsEditing(false);
  };

  const handleUsageConfigChange = (key: string, value: unknown) => {
    setUsageConfig((prev) => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const getResponseDisplay = () => {
    if (!testResult) {
      return { language: 'json' as const, value: '{}' };
    }
    
    const fullResponse = JSON.stringify(testResult, null, 2);
    
    if (testResult.data === null || testResult.data === undefined) {
      if (testResult.error) {
        return { language: 'plaintext' as const, value: `Error: ${testResult.error}\n\nFull Response:\n${fullResponse}` };
      }
      return { language: 'json' as const, value: `No data returned. Full response:\n${fullResponse}` };
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
      
      return { 
        language: 'json' as const, 
        value: JSON.stringify(testResult.data, null, 2) 
      };
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

  const isActive = !!usage && usage.enabled;
  const isConnected = !!usage;
  const resolvedSchema: JsonSchema = usageSchema ?? { type: 'object', properties: {} };

  const CategoryIcon =
    instance.category === 'database'
      ? Database
      : instance.category === 'http'
      ? Globe
      : Puzzle;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-300",
      isActive 
        ? "border-primary/20 bg-card/50 backdrop-blur-sm shadow-sm" 
        : "border-border/40 bg-secondary/5 opacity-80 hover:opacity-100"
    )}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getToolIconUrl(instance.definitionName) ? (
            <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-border/30 flex items-center justify-center p-1.5">
              <img
                src={getToolIconUrl(instance.definitionName)!}
                alt={instance.displayName}
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <CategoryIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-base">
                {instance.name}
              </h3>
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal uppercase tracking-wider opacity-60">
                {instance.displayName}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEdit}
                className="h-8 w-8 p-0 hover:bg-secondary"
                title="Edit query/request"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm("Remove this tool from this app?")) {
                    deleteUsageMutation.mutate();
                  }
                }}
                disabled={deleteUsageMutation.isPending}
                className="text-red-500 hover:text-red-600 hover:bg-red-500/20 h-8 w-8 p-0 border border-red-500/20 hover:border-red-500/40"
                title="Remove tool from this app"
              >
                {deleteUsageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </>
          )}
          {!isConnected && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Activating
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-border/30 animate-in slide-in-from-top-2 duration-300">
          <div className="p-4 space-y-4 bg-secondary/5">
            <UsageConfigForm
              schema={resolvedSchema}
              values={usageConfig}
              onChange={handleUsageConfigChange}
              executorType={instance.executorType}
            />

            <div className="flex flex-col gap-3">
              {testResult && (
                <div
                  className={cn(
                    'rounded-lg border overflow-hidden',
                    testResult.success
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  )}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-inherit bg-inherit/50">
                    {testResult.success ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Terminal className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className={cn(
                      "text-[10px] font-medium uppercase tracking-wider",
                      testResult.success ? "text-emerald-500" : "text-red-500"
                    )}>
                      {testResult.success ? 'Success' : 'Error'}
                    </span>
                  </div>
                  
                  {testResult.data !== undefined || testResult.error ? (
                    <div className="rounded-lg border border-border/60 overflow-hidden bg-muted/30">
                      <div className="px-3 py-1.5 bg-muted/50 border-b border-border/50 text-[10px] font-medium text-muted-foreground">
                        Response
                      </div>
                      <textarea
                        readOnly
                        value={responseDisplay.value}
                        className="w-full h-[200px] p-3 text-xs font-mono bg-transparent text-foreground resize-none focus:outline-none overflow-auto"
                      />
                    </div>
                  ) : (
                    <div className="p-3 bg-black/20">
                      <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto text-muted-foreground custom-scrollbar">
                        No response data
                      </pre>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-8 text-xs px-3"
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending || (instance.executorType === 'sql' && !usageConfig.query) || (instance.executorType === 'http' && !usageConfig.endpoint)}
                    className="h-8 text-xs px-3"
                  >
                    {testMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                    ) : (
                      <Play className="w-3 h-3 mr-1.5" />
                    )}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="h-8 text-xs px-4"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <Save className="w-3 h-3 mr-2" />
                    )}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UsageConfigFormProps {
  schema: JsonSchema;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  executorType: string;
}

function UsageConfigForm({
  schema,
  values,
  onChange,
  executorType,
}: UsageConfigFormProps) {
  if (executorType === 'sql' && schema.properties.query) {
    return (
      <div className="rounded-lg border border-border/60 overflow-hidden shadow-inner bg-[#1e1e1e]">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
          <Code2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">SQL Query</span>
        </div>

        <Editor
          height="180px"
          language="sql"
          theme="vs-dark"
          value={(values.query as string) || ''}
          onChange={(value) => onChange('query', value || '')}
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
    );
  }

  if (executorType === 'http') {
    const method = (values.method as string) || 'GET';
    const authType = (values.authType as string) || 'none';
    const authPrefix = authType === 'bearer' ? 'Bearer' : authType === 'basic' ? 'Basic' : '';
    const authTokenLabel =
      authType === 'bearer'
        ? 'Bearer Token'
        : authType === 'basic'
        ? 'Basic Token'
        : 'API Key';
    
    const getDefaultAuthHeaderName = (type: string) =>
      type === 'api_key' ? 'X-API-Key' : 'Authorization';
    
    const authHeaderName = (values.authHeaderName as string) || getDefaultAuthHeaderName(authType);
    
    const normalizeAuthToken = (value: string) => {
      if (authType === 'bearer') {
        return value.replace(/^Bearer\s+/i, '');
      }
      if (authType === 'basic') {
        return value.replace(/^Basic\s+/i, '');
      }
      return value;
    };

    const handleAuthTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
      const normalized = normalizeAuthToken(e.target.value);
      onChange('authToken', normalized);
    };

    const handleAuthTypeChange = (newAuthType: string) => {
      onChange('authType', newAuthType);
      if (newAuthType === 'api_key' && !values.authHeaderName) {
        onChange('authHeaderName', 'X-API-Key');
      } else if (newAuthType !== 'api_key') {
        onChange('authHeaderName', '');
      }
    };

    const showBody = ['POST', 'PUT', 'PATCH'].includes(method);

    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          {schema.properties.method && (
            <div className="w-24">
              <Label htmlFor="http-method" className="text-xs mb-1.5 block">Method</Label>
              <Select
                value={method}
                onValueChange={(v) => onChange('method', v)}
              >
                <SelectTrigger className="h-9 text-xs" id="http-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(schema.properties.method.enum || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex-1">
            <Label htmlFor="http-endpoint" className="text-xs mb-1.5 block">URL / Endpoint</Label>
            <Input
              id="http-endpoint"
              value={(values.endpoint as string) || ''}
              onChange={(e) => onChange('endpoint', e.target.value)}
              placeholder="https://www.example.com/api/users"
              className="h-9 text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="http-auth-type" className="text-xs mb-1.5 block">Auth Type</Label>
            <Select
              value={authType}
              onValueChange={handleAuthTypeChange}
            >
              <SelectTrigger className="h-9 text-xs" id="http-auth-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
                <SelectItem value="api_key">API Key</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="http-auth-token" className="text-xs mb-1.5 block">{authTokenLabel}</Label>
            {authPrefix ? (
              <div className="flex items-center rounded-md border border-input bg-background">
                <span className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground border-r border-input">
                  {authPrefix}
                </span>
                <Input
                  id="http-auth-token"
                  type="password"
                  value={(values.authToken as string) || ''}
                  onChange={handleAuthTokenChange}
                  placeholder="Enter token"
                  className="h-9 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-xs"
                />
              </div>
            ) : (
              <Input
                id="http-auth-token"
                type="password"
                value={(values.authToken as string) || ''}
                onChange={handleAuthTokenChange}
                placeholder="Enter API key"
                className="h-9 text-xs font-mono"
              />
            )}
          </div>
        </div>

        {authType === 'api_key' && (
          <div>
            <Label htmlFor="http-auth-header" className="text-xs mb-1.5 block">API Key Header Name</Label>
            <Input
              id="http-auth-header"
              value={authHeaderName}
              onChange={(e) => onChange('authHeaderName', e.target.value)}
              placeholder={getDefaultAuthHeaderName('api_key')}
              className="h-9 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Header name to send the API key in (e.g., X-API-Key, Authorization)
            </p>
          </div>
        )}

        {showBody && (
          <div className="rounded-lg border border-border/60 overflow-hidden bg-[#1e1e1e]">
            <div className="px-3 py-1.5 bg-[#2d2d2d] border-b border-[#3d3d3d] text-[10px] font-medium text-muted-foreground">
              Request Body (JSON)
            </div>
            <Editor
              height="120px"
              language="json"
              theme="vs-dark"
              value={(values.body as string) || ''}
              onChange={(value) => onChange('body', value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 8, bottom: 8 },
                fontFamily: 'JetBrains Mono, monospace',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}


