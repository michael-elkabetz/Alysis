import type { ToolExecutor, ExecutorRegistry, TestConnectionResult, ExecuteResult, TestQueryResult } from './executor.interface'
import { sqlExecutor } from './sql.executor'
import { httpExecutor } from './http.executor'
import type { ExecutorType } from '../../db/schema'

const executors: ExecutorRegistry = {
  sql: sqlExecutor,
  http: httpExecutor,
}

export const executorRegistry = {
  getExecutor(executorType: ExecutorType): ToolExecutor | null {
    return executors[executorType] || null
  },

  isSupported(executorType: ExecutorType): boolean {
    return executorType in executors
  },

  getSupportedTypes(): ExecutorType[] {
    return Object.keys(executors) as ExecutorType[]
  },

  async testConnection(
    executorType: ExecutorType,
    config: Record<string, unknown>
  ): Promise<TestConnectionResult> {
    const executor = this.getExecutor(executorType)

    if (!executor) {
      return {
        success: false,
        error: `Unsupported executor type: ${executorType}`,
      }
    }

    return executor.testConnection(config)
  },

  async execute(
    executorType: ExecutorType,
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult> {
    const executor = this.getExecutor(executorType)
    
    if (!executor) {
      return {
        success: false,
        error: `Unsupported executor type: ${executorType}`,
      }
    }

    return executor.execute(config, usageConfig)
  },

  async testQuery(
    executorType: ExecutorType,
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<TestQueryResult> {
    const executor = this.getExecutor(executorType)
    
    if (!executor) {
      return {
        success: false,
        error: `Unsupported executor type: ${executorType}`,
      }
    }

    if (executor.testQuery) {
      return executor.testQuery(config, usageConfig)
    }

    const result = await executor.execute(config, usageConfig)
    return {
      success: result.success,
      rowCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
      data: result.data,
      error: result.error,
    }
  },

  registerExecutor(type: string, executor: ToolExecutor): void {
    executors[type] = executor
  },
}
