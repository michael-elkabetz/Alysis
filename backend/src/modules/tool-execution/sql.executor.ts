import type { ToolExecutor, TestConnectionResult, ExecuteResult, TestQueryResult } from './executor.interface'
import { snowflakeTool } from './snowflake.tool'
import { postgresTool } from './postgres.tool'
import type { SnowflakeConfig, PostgresConfig } from '../../db/schema'

export class SqlExecutor implements ToolExecutor {
  private detectDatabaseType(config: Record<string, unknown>): 'snowflake' | 'postgres' | 'unknown' {
    if ('account' in config && 'warehouse' in config && 'role' in config) {
      return 'snowflake'
    }

    if ('host' in config) {
      return 'postgres'
    }

    return 'unknown'
  }

  async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    const dbType = this.detectDatabaseType(config)

    switch (dbType) {
      case 'snowflake':
        return snowflakeTool.testConnection(config as unknown as SnowflakeConfig)

      case 'postgres':
        return postgresTool.testConnection(config as unknown as PostgresConfig)

      default:
        return {
          success: false,
          error: 'Unable to determine database type from configuration',
        }
    }
  }

  async execute(
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult> {
    const dbType = this.detectDatabaseType(config)
    const query = usageConfig.query as string

    if (!query) {
      return {
        success: false,
        error: 'No query provided in usage configuration',
      }
    }

    const startTime = Date.now()

    try {
      let result: { rows: Record<string, unknown>[]; rowCount: number }

      switch (dbType) {
        case 'snowflake':
          await snowflakeTool.connect(config as unknown as SnowflakeConfig)
          try {
            result = await snowflakeTool.executeQuery(query)
          } finally {
            snowflakeTool.disconnect()
          }
          break

        case 'postgres':
          await postgresTool.connect(config as unknown as PostgresConfig)
          try {
            result = await postgresTool.executeQuery(query)
          } finally {
            await postgresTool.disconnect()
          }
          break

        default:
          return {
            success: false,
            error: 'Unable to determine database type from configuration',
          }
      }

      const latencyMs = Date.now() - startTime

      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount,
        metadata: {
          latencyMs,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during query execution',
      }
    }
  }

  async testQuery(
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<TestQueryResult> {
    const dbType = this.detectDatabaseType(config)
    const query = usageConfig.query as string

    if (!query) {
      return {
        success: false,
        error: 'No query provided in usage configuration',
      }
    }

    switch (dbType) {
      case 'snowflake':
        return snowflakeTool.testQuery(config as unknown as SnowflakeConfig, query)

      case 'postgres':
        return postgresTool.testQuery(config as unknown as PostgresConfig, query)

      default:
        return {
          success: false,
          error: 'Unable to determine database type from configuration',
        }
    }
  }
}

export const sqlExecutor = new SqlExecutor()
