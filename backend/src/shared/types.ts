export type AnalysisStatus = 'draft' | 'active' | 'deprecated'
export type ExecutionStatus = 'success' | 'error'
export type ResponseFormat = 'json' | 'text'
export type Vendor = 'openai' | 'anthropic' | 'gemini'

export interface Analysis {
  id: string
  name: string
  description: string | null
  status: AnalysisStatus
  activeVersionId: string | null
  sampleData: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AnalysisInterfaces {
  output: {
    type: 'object'
    properties: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

export interface PromptVersion {
  id: string
  analysisId: string
  version: number
  systemPrompt: string
  interfaces: AnalysisInterfaces | null
  vendor: Vendor
  model: string
  temperature: number
  maxTokens: number
  responseFormat: ResponseFormat
  publishedAt: Date | null
  createdAt: Date
  createdBy: string
}

export interface ExecutionLog {
  id: string
  analysisId: string
  versionId: string | null
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  rawResponse: string | null
  latencyMs: number
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  } | null
  status: ExecutionStatus
  errorMessage: string | null
  callerService: string | null
  createdAt: Date
}

export interface ApiKey {
  id: string
  name: string
  keyHash: string
  createdAt: Date
  lastUsedAt: Date | null
}

export interface VendorKeyStatus {
  vendor: Vendor
  configured: boolean
  source: 'database' | 'environment' | null
  maskedKey: string | null
  updatedAt: Date | null
}

export interface CreateAnalysisDto {
  name: string
  description?: string
  systemPrompt: string
  interfaces?: AnalysisInterfaces
  vendor?: Vendor
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormat
  sampleData?: string
}

export interface UpdateAnalysisDto {
  name?: string
  description?: string
  sampleData?: string
}

export interface CreatePromptVersionDto {
  systemPrompt: string
  interfaces?: AnalysisInterfaces
  vendor?: Vendor
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormat
}

export interface ExecuteAnalysisDto {
  input: Record<string, unknown>
}

export interface TestPromptDto {
  systemPrompt: string
  input: Record<string, unknown>
  vendor?: Vendor
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormat
  analysisId?: string
}

export interface ClientModel {
  id: string
  name: string
  contextWindow: number
  maxOutput: number
}

export interface ClientInfo {
  name: Vendor
  displayName: string
  available: boolean
  models: ClientModel[]
}

export interface AIResponse {
  content: string
  tokenUsage: {
    prompt: number
    completion: number
    total: number
  }
}

export interface AnalysisStats {
  totalExecutions: number
  successCount: number
  errorCount: number
  avgLatencyMs: number
  totalTokens: number
}

export interface GlobalStats {
  totalApps: number
  activeApps: number
  totalExecutions: number
  successRate: number
  avgLatencyMs: number
  totalTokens: number
}

export interface VersionCostStats {
  versionId: string
  version: number
  model: string
  vendor: Vendor
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  totalInputCost: number
  totalOutputCost: number
  totalCost: number
  avgCostPerExecution: number
  avgTokensPerExecution: number
  executionCount: number
  successRate: number
}

export interface AnalysisCostStats {
  analysisId: string
  totalCost: number
  versionStats: VersionCostStats[]
}
