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

export type AnalysisStatus = 'draft' | 'active' | 'deprecated';
export type ExecutionStatus = 'success' | 'error';
export type ResponseFormat = 'json' | 'text';
export type Vendor = 'openai' | 'anthropic' | 'gemini';
export type Provider = Vendor;

export interface Analysis {
  id: string;
  name: string;
  description: string | null;
  status: AnalysisStatus;
  activeVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisWithApiKey extends Analysis {
  apiKey: {
    id: string;
    name: string;
    key: string;
  };
}

export interface PromptVersion {
  id: string;
  analysisId: string;
  version: number;
  systemPrompt: string;
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

export interface AnalysisStats {
  totalExecutions: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  totalTokens: number;
}

export interface GlobalStats {
  totalAnalyses: number;
  activeAnalyses: number;
  totalExecutions: number;
  successRate: number;
  avgLatencyMs: number;
  totalTokens: number;
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

export interface CreateAnalysisDto {
  name: string;
  description?: string;
  systemPrompt: string;
  vendor?: Vendor;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ResponseFormat;
}

export interface UpdateAnalysisDto {
  name?: string;
  description?: string;
}

export async function createAnalysis(dto: CreateAnalysisDto): Promise<AnalysisWithApiKey> {
  return fetchApi<AnalysisWithApiKey>('/api/v1/analyses', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getAnalyses(search?: string): Promise<Analysis[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  const queryString = params.toString();
  return fetchApi<Analysis[]>(`/api/v1/analyses${queryString ? `?${queryString}` : ''}`);
}

export async function getActiveAnalyses(): Promise<Analysis[]> {
  return fetchApi<Analysis[]>('/api/v1/analyses/active');
}

export async function getAnalysis(id: string): Promise<Analysis> {
  return fetchApi<Analysis>(`/api/v1/analyses/${id}`);
}

export async function updateAnalysis(id: string, dto: UpdateAnalysisDto): Promise<Analysis> {
  return fetchApi<Analysis>(`/api/v1/analyses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function deleteAnalysis(id: string): Promise<void> {
  await fetchApi<{ success: boolean }>(`/api/v1/analyses/${id}`, {
    method: 'DELETE',
  });
}

export async function activateAnalysis(id: string): Promise<Analysis> {
  return fetchApi<Analysis>(`/api/v1/analyses/${id}/activate`, {
    method: 'POST',
  });
}

export async function deprecateAnalysis(id: string): Promise<Analysis> {
  return fetchApi<Analysis>(`/api/v1/analyses/${id}/deprecate`, {
    method: 'POST',
  });
}

export async function getAnalysisStats(id: string): Promise<AnalysisStats> {
  return fetchApi<AnalysisStats>(`/api/v1/analyses/${id}/stats`);
}

export async function getAnalysisLogs(
  id: string,
  limit = 50,
  offset = 0
): Promise<{ logs: ExecutionLog[]; total: number }> {
  return fetchApi<{ logs: ExecutionLog[]; total: number }>(
    `/api/v1/analyses/${id}/logs?limit=${limit}&offset=${offset}`
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
  analysisId: string,
  dto: CreatePromptVersionDto
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/analyses/${analysisId}/prompts`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getPromptVersions(analysisId: string): Promise<PromptVersion[]> {
  return fetchApi<PromptVersion[]>(`/api/v1/analyses/${analysisId}/prompts`);
}

export async function getLatestPromptVersion(analysisId: string): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/analyses/${analysisId}/prompts/latest`);
}

export async function getActivePromptVersion(analysisId: string): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/analyses/${analysisId}/prompts/active`);
}

export async function getPromptVersion(
  analysisId: string,
  promptId: string
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/analyses/${analysisId}/prompts/${promptId}`);
}

export async function publishPromptVersion(
  analysisId: string,
  promptId: string
): Promise<PromptVersion> {
  return fetchApi<PromptVersion>(`/api/v1/analyses/${analysisId}/prompts/${promptId}/publish`, {
    method: 'POST',
  });
}

export async function deletePromptVersion(
  analysisId: string,
  promptId: string
): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>(`/api/v1/analyses/${analysisId}/prompts/${promptId}`, {
    method: 'DELETE',
  });
}

export async function testPromptVersion(
  analysisId: string,
  promptId: string,
  input: Record<string, unknown>
): Promise<ExecutionLog> {
  return fetchApi<ExecutionLog>(`/api/v1/analyses/${analysisId}/prompts/${promptId}/test`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

export interface ExecuteAnalysisResult {
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

export async function executeAnalysis(
  analysisId: string,
  input: Record<string, unknown>
): Promise<ExecuteAnalysisResult> {
  return fetchApi<ExecuteAnalysisResult>(`/api/v1/analyze/${analysisId}`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  });
}

export async function getExecutionLog(executionId: string): Promise<ExecutionLog> {
  return fetchApi<ExecutionLog>(`/api/v1/logs/${executionId}`);
}

export async function getRecentLogs(limit = 50): Promise<ExecutionLog[]> {
  return fetchApi<ExecutionLog[]>(`/api/v1/logs?limit=${limit}`);
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
  return fetchApi<TestPromptResult>('/api/v1/analyses/test-prompt', {
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

export interface TestAnalysisPromptDto {
  systemPrompt: string;
  vendor: Vendor;
  model: string;
  input: Record<string, unknown>;
  analysisId?: string;
}

export interface TestAnalysisPromptResult {
  output: Record<string, unknown>;
  latencyMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  rawResponse: string;
}

export async function testAnalysisPrompt(
  dto: TestAnalysisPromptDto
): Promise<TestAnalysisPromptResult> {
  return fetchApi<TestAnalysisPromptResult>('/api/v1/analyses/test-prompt', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getAnalysisApiKeys(analysisId: string): Promise<ApiKeyInfo[]> {
  return fetchApi<ApiKeyInfo[]>(`/api/v1/analyses/${analysisId}/api-keys`);
}

export async function createAnalysisApiKey(
  analysisId: string,
  name?: string
): Promise<{ id: string; name: string; key: string; createdAt: string }> {
  return fetchApi(`/api/v1/analyses/${analysisId}/api-keys`, {
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

export async function healthCheck(): Promise<{
  status: string;
  timestamp: string;
  runtime: string;
  version: string;
}> {
  return fetchApi('/api/health');
}
