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
  createdAt: Date
  updatedAt: Date
}

export interface PromptVersion {
  id: string
  analysisId: string
  version: number
  systemPrompt: string
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
  vendor?: Vendor
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: ResponseFormat
}

export interface UpdateAnalysisDto {
  name?: string
  description?: string
}

export interface CreatePromptVersionDto {
  systemPrompt: string
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
  totalAnalyses: number
  activeAnalyses: number
  totalExecutions: number
  successRate: number
  avgLatencyMs: number
  totalTokens: number
}
