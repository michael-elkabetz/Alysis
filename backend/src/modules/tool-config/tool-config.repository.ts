import { db, schema } from '../../db'
import { eq } from 'drizzle-orm'
import type { ToolType, SnowflakeConfig, PostgresConfig } from '../../shared/types'

export interface ToolConfigRecord {
  id: string
  toolType: ToolType
  config: SnowflakeConfig | PostgresConfig
  createdAt: Date
  updatedAt: Date
}

export const toolConfigRepository = {
  async findAll(): Promise<ToolConfigRecord[]> {
    const results = await db.select().from(schema.toolConfigs)
    return results.map((r) => ({
      id: r.id,
      toolType: r.toolType as ToolType,
      config: r.config as SnowflakeConfig | PostgresConfig,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  },

  async findByToolType(toolType: ToolType): Promise<ToolConfigRecord | null> {
    const [config] = await db
      .select()
      .from(schema.toolConfigs)
      .where(eq(schema.toolConfigs.toolType, toolType))
      .limit(1)
    if (!config) return null
    return {
      id: config.id,
      toolType: config.toolType as ToolType,
      config: config.config as SnowflakeConfig | PostgresConfig,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }
  },

  async upsert(data: { id: string; toolType: ToolType; config: SnowflakeConfig | PostgresConfig }): Promise<ToolConfigRecord> {
    const now = new Date()
    const [result] = await db
      .insert(schema.toolConfigs)
      .values({
        id: data.id,
        toolType: data.toolType,
        config: data.config,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.toolConfigs.toolType,
        set: {
          config: data.config,
          updatedAt: now,
        },
      })
      .returning()
    return {
      id: result.id,
      toolType: result.toolType as ToolType,
      config: result.config as SnowflakeConfig | PostgresConfig,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }
  },

  async delete(toolType: ToolType): Promise<boolean> {
    await db.delete(schema.toolConfigs).where(eq(schema.toolConfigs.toolType, toolType))
    return true
  },
}
