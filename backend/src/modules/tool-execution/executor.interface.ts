export interface TestConnectionResult {
  success: boolean
  error?: string
}

export interface ExecuteResult {
  success: boolean
  data?: Record<string, unknown>[] | Record<string, unknown>
  rowCount?: number
  error?: string
  metadata?: {
    latencyMs?: number
    statusCode?: number
    headers?: Record<string, string>
  }
}

export interface TestQueryResult {
  success: boolean
  rowCount?: number
  data?: unknown
  error?: string
}

export interface ToolExecutor {
  testConnection(config: Record<string, unknown>): Promise<TestConnectionResult>

  execute(
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult>

  testQuery?(
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<TestQueryResult>
}

export type ExecutorRegistry = Record<string, ToolExecutor>
