import { nanoid } from 'nanoid'
import { toolConfigRepository } from './tool-config.repository'
import { snowflakeTool } from '../tool-execution/snowflake.tool'
import { postgresTool } from '../tool-execution/postgres.tool'
import type { ToolType, SnowflakeConfig, PostgresConfig, ToolConfigStatus, SnowflakeMaskedConfig, PostgresMaskedConfig, ToolConfigMaskedConfig } from '../../shared/types'

function maskSnowflakeConfig(config: SnowflakeConfig): SnowflakeMaskedConfig {
  return {
    account: config.account,
    user: config.user,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
    role: config.role,
  }
}

function maskPostgresConfig(config: PostgresConfig): PostgresMaskedConfig {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
  }
}

export const toolConfigService = {
  async getStatuses(): Promise<ToolConfigStatus[]> {
    const toolTypes: ToolType[] = ['snowflake', 'postgres']
    const configs = await toolConfigRepository.findAll()

    return toolTypes.map((toolType) => {
      const config = configs.find((c) => c.toolType === toolType)

      if (config) {
        const maskedConfig = toolType === 'snowflake'
          ? maskSnowflakeConfig(config.config as SnowflakeConfig)
          : maskPostgresConfig(config.config as PostgresConfig)

        return {
          toolType,
          configured: true,
          maskedConfig,
          updatedAt: config.updatedAt,
        }
      }

      return {
        toolType,
        configured: false,
        maskedConfig: null,
        updatedAt: null,
      }
    })
  },

  async getConfig(toolType: ToolType) {
    return toolConfigRepository.findByToolType(toolType)
  },

  async upsertConfig(
    toolType: ToolType,
    config: SnowflakeConfig | PostgresConfig,
  ): Promise<ToolConfigStatus> {
    const id = `tc-${nanoid(10)}`

    const existing = await toolConfigRepository.findByToolType(toolType)
    let finalConfig = config

    if (existing) {
      if (toolType === 'snowflake') {
        const existingConfig = existing.config as SnowflakeConfig
        const newConfig = config as SnowflakeConfig
        finalConfig = {
          ...newConfig,
          privateKey: newConfig.privateKey || existingConfig.privateKey,
          privateKeyPassword: newConfig.privateKeyPassword || existingConfig.privateKeyPassword,
          password: newConfig.password || existingConfig.password,
        }
      } else if (toolType === 'postgres') {
        const existingConfig = existing.config as PostgresConfig
        const newConfig = config as PostgresConfig
        finalConfig = {
          ...newConfig,
          password: newConfig.password || existingConfig.password,
        }
      }
    }

    const result = await toolConfigRepository.upsert({
      id,
      toolType,
      config: finalConfig,
    })

    const maskedConfig = toolType === 'snowflake'
      ? maskSnowflakeConfig(result.config as SnowflakeConfig)
      : maskPostgresConfig(result.config as PostgresConfig)

    return {
      toolType,
      configured: true,
      maskedConfig,
      updatedAt: result.updatedAt,
    }
  },

  async deleteConfig(toolType: ToolType): Promise<boolean> {
    return toolConfigRepository.delete(toolType)
  },

  async testConnection(toolType: ToolType): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig(toolType)
    if (!config) {
      return { success: false, error: `Tool ${toolType} not configured` }
    }

    if (toolType === 'snowflake') {
      return snowflakeTool.testConnection(config.config as SnowflakeConfig)
    }

    if (toolType === 'postgres') {
      return postgresTool.testConnection(config.config as PostgresConfig)
    }

    return { success: false, error: 'Unknown tool type' }
  },

  async testQuery(
    toolType: ToolType,
    query: string,
  ): Promise<{ success: boolean; rowCount?: number; error?: string }> {
    const config = await this.getConfig(toolType)
    if (!config) {
      return { success: false, error: `Tool ${toolType} not configured` }
    }

    if (toolType === 'snowflake') {
      return snowflakeTool.testQuery(config.config as SnowflakeConfig, query)
    }

    if (toolType === 'postgres') {
      return postgresTool.testQuery(config.config as PostgresConfig, query)
    }

    return { success: false, error: 'Unknown tool type' }
  },

  async executeQuery(
    toolType: ToolType,
    query: string,
  ): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    const config = await this.getConfig(toolType)
    if (!config) {
      throw new Error(`Tool ${toolType} not configured`)
    }

    if (toolType === 'snowflake') {
      await snowflakeTool.connect(config.config as SnowflakeConfig)
      try {
        return await snowflakeTool.executeQuery(query)
      } finally {
        snowflakeTool.disconnect()
      }
    }

    if (toolType === 'postgres') {
      await postgresTool.connect(config.config as PostgresConfig)
      try {
        return await postgresTool.executeQuery(query)
      } finally {
        await postgresTool.disconnect()
      }
    }

    throw new Error('Unknown tool type')
  },
}
