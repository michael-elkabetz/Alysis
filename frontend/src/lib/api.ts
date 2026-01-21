const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

function getApiUrl(path: string): string {
  return new URL(path, API_BASE_URL || window.location.origin).toString();
}

export function getApiBaseUrl(): string {
  return API_BASE_URL || window.location.origin;
}

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export type AppStatus = 'draft' | 'active' | 'deprecated';
export type ExecutionStatus = 'success' | 'error';
export type ResponseFormat = 'json' | 'text';
export type Vendor = 'openai' | 'anthropic' | 'gemini';
export type Provider = Vendor;
export type ToolType = 'snowflake' | 'postgres';

export interface AppToolUsage {
  snowflake?: {
    enabled: boolean;
    query: string;
  };
  postgres?: {
    enabled: boolean;
    query: string;
  };
}

export interface SnowflakeConfig {
  account: string;
  user: string;
  warehouse: string;
  database: string;
  schema?: string;
  role: string;
  privateKey?: string;
  privateKeyPassword?: string;
  password?: string;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

export interface SnowflakeMaskedConfig {
  account?: string;
  user?: string;
  warehouse?: string;
  database?: string;
  schema?: string;
  role?: string;
}

export interface PostgresMaskedConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
}

export type ToolConfigMaskedConfig = SnowflakeMaskedConfig | PostgresMaskedConfig;

export interface ToolConfigStatus {
  toolType: ToolType;
  configured: boolean;
  maskedConfig: ToolConfigMaskedConfig | null;
  updatedAt: string | null;
}

export interface App {
  id: string;
  name: string;
  description: string | null;
  status: AppStatus;
  activeVersionId: string | null;
  sampleData: string | null;
  toolUsage: AppToolUsage | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppWithApiKey extends App {
  apiKey: {
    id: string;
    name: string;
    key: string;
  };
}

export interface AppInterfaces {
  output: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  _rawOutput?: Record<string, unknown>;
}

export interface PromptVersion {
  id: string;
  analysisId: string;
  version: number;
  systemPrompt: string;
  interfaces: AppInterfaces | null;
  vendor: Vendor;
  model: string;
  temperature: number;
  maxTokens: number;
  responseFormat: ResponseFormat;
  publishedAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface ExecutionLog {
  id: string;
  analysisId: string;
  versionId: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  rawResponse: string | null;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  } | null;
  status: ExecutionStatus;
  errorMessage: string | null;
  callerService: string | null;
  createdAt: string;
}

export interface AppStats {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  totalTokens: number;
}

export interface GlobalStats {
  totalApps: number;
  activeApps: number;
  totalExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
}

export interface VersionCostStats {
  versionId: string;
  version: number;
  model: string;
  vendor: Vendor;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalInputCost: number;
  totalOutputCost: number;
  totalCost: number;
  avgCostPerExecution: number;
  avgTokensPerExecution: number;
  executionCount: number;
  successRate: number;
}

export interface ClientModel {
  id: string;
  name: string;
  contextWindow: number;
  maxOutput: number;
}

export interface ClientInfo {
  name: Vendor;
  displayName: string;
  available: boolean;
  models: ClientModel[];
}

export interface VendorOption {
  id: string;
  displayName: string;
}

export interface ModelOption {
  id: string;
  displayName: string;
}

export interface VendorsAndModels {
  vendors: VendorOption[];
  modelsByVendor: Record<string, ModelOption[]>;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateAppDto {
  name: string;
  description?: string;
  systemPrompt: string;
  interfaces?: AppInterfaces;
  vendor?: Vendor;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
  sampleData?: string;
}

export interface UpdateAppDto {
  name?: string;
  description?: string;
  sampleData?: string;
  toolUsage?: AppToolUsage;
}

export interface MagicGenerateResult {
  name: string;
  description: string;
  systemPrompt: string;
  sampleData: string;
}

export interface MagicGenerateDto {
  description: string;
  vendor?: Vendor;
  model?: string;
}

export async function magicGenerate(dto: MagicGenerateDto): Promise<MagicGenerateResult> {
  return fetchApi<MagicGenerateResult>('/api/v1/apps/magic', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function createApp(dto: CreateAppDto): Promise<AppWithApiKey> {
  return fetchApi<AppWithApiKey>('/api/v1/apps', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getApps(search?: string): Promise<App[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const queryString = params.toString();
  return fetchApi<App[]>(`/api/v1/apps${queryString ? `?${queryString}` : ''}`);
}

export async function getApp(id: string): Promise<App> {
  return fetchApi<App>(`/api/v1/apps/${id}`);
}

export async function updateApp(id: string, dto: UpdateAppDto): Promise<App> {
  return fetchApi<App>(`/api/v1/apps/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteApp(id: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/apps/${id}`, {
    method: 'DELETE',
  });
}

export async function getAppStats(id: string, versionId?: string): Promise<AppStats> {
  const params = new URLSearchParams();
  if (versionId) params.set('versionId', versionId);
  const queryString = params.toString();
  return fetchApi<AppStats>(`/api/v1/apps/${id}/stats${queryString ? `?${queryString}` : ''}`);
}

export async function getVersionCostStats(appId: string): Promise<VersionCostStats[]> {
  return fetchApi<VersionCostStats[]>(`/api/v1/apps/${appId}/cost-stats`);
}

export async function getAppLogs(
  id: string,
  limit = 50,
  offset = 0
): Promise<{ logs: ExecutionLog[]; total: number }> {
  return fetchApi<{ logs: ExecutionLog[]; total: number }>(
    `/api/v1/apps/${id}/logs?limit=${limit}&offset=${offset}`
  );
}

export interface CreatePromptVersionDto {
  systemPrompt: string;
  vendor?: Vendor;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
}

export async function createPromptVersion(
  appId: string,
  dto: CreatePromptVersionDto
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/apps/${appId}/prompts`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getPromptVersions(appId: string): Promise<PromptVersion[]> {
  return fetchApi<PromptVersion[]>(`/api/v1/apps/${appId}/prompts`);
}

export async function getLatestPromptVersion(appId: string): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/apps/${appId}/prompts/latest`);
}

export async function getActivePromptVersion(appId: string): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/apps/${appId}/prompts/active`);
}

export async function getPromptVersion(
  appId: string,
  promptId: string
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/apps/${appId}/prompts/${promptId}`);
}

export async function publishPromptVersion(
  appId: string,
  promptId: string
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/apps/${appId}/prompts/${promptId}/publish`, {
    method: 'POST',
  });
}

export async function deletePromptVersion(
  appId: string,
  promptId: string
): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/v1/apps/${appId}/prompts/${promptId}`, {
    method: 'DELETE',
  });
}

export async function updatePromptInterfaces(
  appId: string,
  promptId: string,
  interfaces: AppInterfaces
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/apps/${appId}/prompts/${promptId}/interfaces`, {
    method: 'PUT',
    body: JSON.stringify({ interfaces }),
  });
}

export async function testPromptVersion(
  appId: string,
  promptId: string,
  input: Record<string, unknown>
): Promise<ExecutionLog> {
  return fetchApi<ExecutionLog>(`/api/v1/apps/${appId}/prompts/${promptId}/test`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

export interface ExecuteAppResult {
  id: string;
  output: Record<string, unknown> | null;
  status: ExecutionStatus;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  } | null;
  errorMessage: string | null;
}

export async function executeApp(
  appId: string,
  input: Record<string, unknown>
): Promise<ExecuteAppResult> {
  return fetchApi<ExecuteAppResult>(`/api/v1/analyze/${appId}`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

export async function getExecutionLog(executionId: string): Promise<ExecutionLog> {
  return fetchApi<ExecutionLog>(`/api/v1/logs/${executionId}`);
}

export async function getGlobalStats(): Promise<GlobalStats> {
  return fetchApi<GlobalStats>('/api/v1/stats');
}

export interface TestPromptDto {
  systemPrompt: string;
  input: Record<string, unknown>;
  vendor?: Vendor;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
}

export interface TestPromptResult {
  output: Record<string, unknown> | null;
  rawResponse: string;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
}

export async function testPrompt(dto: TestPromptDto): Promise<TestPromptResult> {
  return fetchApi<TestPromptResult>('/api/v1/apps/test-prompt', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getClients(): Promise<ClientInfo[]> {
  return fetchApi<ClientInfo[]>('/api/v1/clients');
}

export async function getClientModels(vendor: Vendor): Promise<ClientModel[]> {
  return fetchApi<ClientModel[]>(`/api/v1/clients/${vendor}/models`);
}

export async function getVendorsAndModels(): Promise<VendorsAndModels> {
  return fetchApi<VendorsAndModels>('/api/v1/clients/vendors');
}

export interface TestAppPromptDto {
  systemPrompt: string;
  vendor: Vendor;
  model: string;
  input: Record<string, unknown>;
  appId?: string;
  versionId?: string;
}

export interface TestAppPromptResult {
  output: Record<string, unknown>;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  rawResponse: string;
}

export async function testAppPrompt(
  dto: TestAppPromptDto
): Promise<TestAppPromptResult> {
  return fetchApi<TestAppPromptResult>('/api/v1/apps/test-prompt', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getAppApiKeys(appId: string): Promise<ApiKeyInfo[]> {
  return fetchApi<ApiKeyInfo[]>(`/api/v1/apps/${appId}/api-keys`);
}

export async function createAppApiKey(
  appId: string,
  name?: string
): Promise<{ id: string; name: string; key: string; createdAt: string }> {
  return fetchApi(`/api/v1/apps/${appId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteApiKey(keyId: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/api-keys/${keyId}`, {
    method: 'DELETE',
  });
}

export async function regenerateApiKey(
  keyId: string
): Promise<{ id: string; name: string; key: string; createdAt: string }> {
  return fetchApi(`/api/v1/api-keys/${keyId}/regenerate`, {
    method: 'POST',
  });
}

export interface VendorKeyStatus {
  vendor: Vendor;
  configured: boolean;
  source: 'database' | 'environment' | null;
  maskedKey: string | null;
  updatedAt: string | null;
}

export async function getVendorKeyStatuses(): Promise<VendorKeyStatus[]> {
  return fetchApi<VendorKeyStatus[]>('/api/v1/vendor-keys');
}

export async function setVendorKey(
  vendor: Vendor,
  apiKey: string
): Promise<VendorKeyStatus> {
  return fetchApi<VendorKeyStatus>(`/api/v1/vendor-keys/${vendor}`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  });
}

export async function deleteVendorKey(vendor: Vendor): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/vendor-keys/${vendor}`, {
    method: 'DELETE',
  });
}

export async function getToolConfigStatuses(): Promise<ToolConfigStatus[]> {
  return fetchApi<ToolConfigStatus[]>('/api/v1/tool-configs');
}

export async function getToolConfigStatus(toolType: ToolType): Promise<ToolConfigStatus> {
  return fetchApi<ToolConfigStatus>(`/api/v1/tool-configs/${toolType}`);
}

export async function setToolConfig(
  toolType: ToolType,
  config: SnowflakeConfig | PostgresConfig
): Promise<ToolConfigStatus> {
  return fetchApi<ToolConfigStatus>(`/api/v1/tool-configs/${toolType}`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

export async function deleteToolConfig(toolType: ToolType): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/tool-configs/${toolType}`, {
    method: 'DELETE',
  });
}

export async function testToolConnection(
  toolType: ToolType
): Promise<{ success: boolean; error?: string }> {
  return fetchApi<{ success: boolean; error?: string }>(`/api/v1/tool-configs/${toolType}/test`, {
    method: 'POST',
  });
}

export async function testToolQuery(
  toolType: ToolType,
  query: string
): Promise<{ success: boolean; rowCount?: number; error?: string; data?: unknown }> {
  return fetchApi<{ success: boolean; rowCount?: number; error?: string }>(
    `/api/v1/tool-configs/${toolType}/test-query`,
    {
      method: 'POST',
      body: JSON.stringify({ query }),
    }
  );
}

export async function testAppToolQuery(
  appId: string,
  query?: string
): Promise<{ success: boolean; rowCount?: number; error?: string; data?: unknown }> {
  return fetchApi<{ success: boolean; rowCount?: number; error?: string }>(
    `/api/v1/apps/${appId}/test-tool`,
    {
      method: 'POST',
      body: JSON.stringify({ query }),
    }
  );
}

export type ToolCategory = 'database' | 'http' | 'storage' | 'custom';
export type ExecutorType = 'sql' | 'http' | 'storage' | 'custom';

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  format?: 'password' | 'uri' | 'email' | 'textarea';
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  category: ToolCategory;
  executorType: ExecutorType;
  configSchema: JsonSchema;
  usageSchema: JsonSchema;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ToolInstance {
  id: string;
  name: string;
  toolDefinitionId: string;
  config: Record<string, unknown>;
  maskedConfig: Record<string, unknown>;
  definition: {
    id: string;
    name: string;
    displayName: string;
    category: string;
    executorType: string;
    configSchema: JsonSchema;
    usageSchema: JsonSchema;
    builtIn: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ToolInstanceStatus {
  id: string;
  name: string;
  toolDefinitionId: string;
  definitionName: string;
  displayName: string;
  category: string;
  executorType: string;
  configured: boolean;
  maskedConfig: Record<string, unknown>;
  updatedAt: string;
}

export interface AppToolUsageV2 {
  id: string;
  appId: string;
  toolInstanceId: string;
  enabled: boolean;
  usageConfig: Record<string, unknown>;
  instance: {
    id: string;
    name: string;
  };
  definition: {
    id: string;
    name: string;
    displayName: string;
    category: string;
    executorType: string;
    usageSchema: JsonSchema;
  };
  createdAt: string;
  updatedAt: string;
}

export async function getToolDefinitions(): Promise<ToolDefinition[]> {
  return fetchApi<ToolDefinition[]>('/api/v1/tool-definitions');
}

export async function getToolDefinition(id: string): Promise<ToolDefinition> {
  return fetchApi<ToolDefinition>(`/api/v1/tool-definitions/${id}`);
}

export async function getToolDefinitionsByCategory(category: ToolCategory): Promise<ToolDefinition[]> {
  return fetchApi<ToolDefinition[]>(`/api/v1/tool-definitions/category/${category}`);
}

export async function getToolCategories(): Promise<{ category: ToolCategory; count: number }[]> {
  return fetchApi<{ category: ToolCategory; count: number }[]>('/api/v1/tool-definitions/categories');
}

export interface CreateToolDefinitionDto {
  name: string;
  displayName: string;
  description?: string;
  category: ToolCategory;
  executorType: ExecutorType;
  configSchema: JsonSchema;
  usageSchema: JsonSchema;
}

export async function createToolDefinition(dto: CreateToolDefinitionDto): Promise<ToolDefinition> {
  return fetchApi<ToolDefinition>('/api/v1/tool-definitions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateToolDefinition(
  id: string,
  dto: Partial<Omit<CreateToolDefinitionDto, 'name' | 'category' | 'executorType'>>
): Promise<ToolDefinition> {
  return fetchApi<ToolDefinition>(`/api/v1/tool-definitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteToolDefinition(id: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/tool-definitions/${id}`, {
    method: 'DELETE',
  });
}

export async function getToolInstances(): Promise<ToolInstance[]> {
  return fetchApi<ToolInstance[]>('/api/v1/tool-instances');
}

export async function getToolInstanceStatuses(): Promise<ToolInstanceStatus[]> {
  return fetchApi<ToolInstanceStatus[]>('/api/v1/tool-instances/statuses');
}

export async function getToolInstance(id: string): Promise<ToolInstance> {
  return fetchApi<ToolInstance>(`/api/v1/tool-instances/${id}`);
}

export async function getToolInstancesByDefinition(definitionId: string): Promise<ToolInstance[]> {
  return fetchApi<ToolInstance[]>(`/api/v1/tool-instances/by-definition/${definitionId}`);
}

export interface CreateToolInstanceDto {
  toolDefinitionId: string;
  name: string;
  config: Record<string, unknown>;
}

export async function createToolInstance(dto: CreateToolInstanceDto): Promise<ToolInstance> {
  return fetchApi<ToolInstance>('/api/v1/tool-instances', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateToolInstance(
  id: string,
  dto: Partial<Omit<CreateToolInstanceDto, 'toolDefinitionId'>>
): Promise<ToolInstance> {
  return fetchApi<ToolInstance>(`/api/v1/tool-instances/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteToolInstance(id: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/tool-instances/${id}`, {
    method: 'DELETE',
  });
}

export async function testToolInstanceConnection(id: string): Promise<{ success: boolean; error?: string }> {
  return fetchApi<{ success: boolean; error?: string }>(`/api/v1/tool-instances/${id}/test`, {
    method: 'POST',
  });
}

export async function testToolInstanceQuery(
  id: string,
  usageConfig: Record<string, unknown>
): Promise<{ success: boolean; rowCount?: number; error?: string; data?: unknown }> {
  return fetchApi<{ success: boolean; rowCount?: number; error?: string; data?: unknown }>(
    `/api/v1/tool-instances/${id}/test-query`,
    {
      method: 'POST',
      body: JSON.stringify({ usageConfig }),
    }
  );
}

export async function getAppToolUsages(appId: string): Promise<AppToolUsageV2[]> {
  return fetchApi<AppToolUsageV2[]>(`/api/v1/apps/${appId}/tools`);
}

export async function getAppToolUsage(appId: string, usageId: string): Promise<AppToolUsageV2> {
  return fetchApi<AppToolUsageV2>(`/api/v1/apps/${appId}/tools/${usageId}`);
}

export interface CreateAppToolUsageDto {
  toolInstanceId: string;
  enabled?: boolean;
  usageConfig: Record<string, unknown>;
}

export async function createAppToolUsage(appId: string, dto: CreateAppToolUsageDto): Promise<AppToolUsageV2> {
  return fetchApi<AppToolUsageV2>(`/api/v1/apps/${appId}/tools`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateAppToolUsage(
  appId: string,
  usageId: string,
  dto: Partial<Omit<CreateAppToolUsageDto, 'toolInstanceId'>>
): Promise<AppToolUsageV2> {
  return fetchApi<AppToolUsageV2>(`/api/v1/apps/${appId}/tools/${usageId}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function upsertAppToolUsage(
  appId: string,
  instanceId: string,
  dto: Partial<Omit<CreateAppToolUsageDto, 'toolInstanceId'>>
): Promise<AppToolUsageV2> {
  return fetchApi<AppToolUsageV2>(`/api/v1/apps/${appId}/tools/instance/${instanceId}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteAppToolUsage(appId: string, usageId: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/apps/${appId}/tools/${usageId}`, {
    method: 'DELETE',
  });
}

export async function toggleAppToolUsage(
  appId: string,
  usageId: string,
  enabled: boolean
): Promise<AppToolUsageV2> {
  return fetchApi<AppToolUsageV2>(`/api/v1/apps/${appId}/tools/${usageId}/toggle`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
}

export async function testAppToolUsageQuery(
  appId: string,
  usageId: string
): Promise<{ success: boolean; rowCount?: number; error?: string; data?: unknown }> {
  return fetchApi<{ success: boolean; rowCount?: number; error?: string }>(
    `/api/v1/apps/${appId}/tools/${usageId}/test`,
    {
      method: 'POST',
    }
  );
}

export async function executeAppToolUsage(
  appId: string,
  usageId: string,
  usageConfig?: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return fetchApi<{ success: boolean; data?: unknown; error?: string }>(
    `/api/v1/apps/${appId}/tools/${usageId}/execute`,
    {
      method: 'POST',
      body: usageConfig ? JSON.stringify({ usageConfig }) : undefined,
    }
  );
}

export type Analysis = App;
export type AnalysisStatus = AppStatus;
export type AnalysisWithApiKey = AppWithApiKey;
export type AnalysisInterfaces = AppInterfaces;
export type AnalysisStats = AppStats;
export type CreateAnalysisDto = CreateAppDto;
export type UpdateAnalysisDto = UpdateAppDto;
export type ExecuteAnalysisResult = ExecuteAppResult;
export type TestAnalysisPromptDto = TestAppPromptDto;
export type TestAnalysisPromptResult = TestAppPromptResult;export const createAnalysis = createApp;
export const getAnalyses = getApps;
export const getAnalysis = getApp;
export const updateAnalysis = updateApp;
export const deleteAnalysis = deleteApp;
export const getAnalysisStats = getAppStats;
export const getAnalysisLogs = getAppLogs;
export const executeAnalysis = executeApp;
export const testAnalysisPrompt = testAppPrompt;
export const getAnalysisApiKeys = getAppApiKeys;
export const createAnalysisApiKey = createAppApiKey;