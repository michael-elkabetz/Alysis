import type { PostgresConfig } from '../../../shared/types'
import postgres from 'postgres'

interface PostgresQueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
}

export const postgresTool = {
  sql: null as ReturnType<typeof postgres> | null,

  async connect(config: PostgresConfig): Promise<void> {
    if (this.sql) {
      await this.disconnect()
    }
    this.sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.user,
      password: config.password,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  },

  async executeQuery(query: string): Promise<PostgresQueryResult> {
    if (!this.sql) {
      throw new Error('PostgreSQL not connected')
    }

    const rows = await this.sql.unsafe(query)
    return {
      rows: rows as Record<string, unknown>[],
      rowCount: rows.length,
    }
  },

  async testConnection(config: PostgresConfig): Promise<{ success: boolean; error?: string }> {
    try {
      await this.connect(config)
      await this.executeQuery('SELECT 1')
      await this.disconnect()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  async testQuery(
    config: PostgresConfig,
    query: string,
  ): Promise<{ success: boolean; rowCount?: number; data?: unknown; error?: string }> {
    try {
      await this.connect(config)
      const result = await this.executeQuery(query)
      await this.disconnect()
      return { success: true, rowCount: result.rowCount, data: result.rows }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  async disconnect(): Promise<void> {
    if (this.sql) {
      try {
        await this.sql.end()
      } catch (error) {
      } finally {
        this.sql = null
      }
    }
  },
}
