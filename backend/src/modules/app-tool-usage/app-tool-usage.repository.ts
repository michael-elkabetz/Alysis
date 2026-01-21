import { db } from '../../db'
import { appToolUsages, toolInstances, toolDefinitions, type AppToolUsageRow, type NewAppToolUsage, type JsonSchema } from '../../db/schema'
import { eq, and } from 'drizzle-orm'

export interface AppToolUsageWithInstance extends AppToolUsageRow {
  instance: {
    id: string
    name: string
    toolDefinitionId: string
    config: Record<string, unknown>
  }
  definition: {
    id: string
    name: string
    displayName: string
    category: string
    executorType: string
    usageSchema: JsonSchema
  }
}

export const appToolUsageRepository = {
  async findByAppId(appId: string): Promise<AppToolUsageWithInstance[]> {
    const results = await db
      .select({
        usage: appToolUsages,
        instance: {
          id: toolInstances.id,
          name: toolInstances.name,
          toolDefinitionId: toolInstances.toolDefinitionId,
          config: toolInstances.config,
        },
        definition: {
          id: toolDefinitions.id,
          name: toolDefinitions.name,
          displayName: toolDefinitions.displayName,
          category: toolDefinitions.category,
          executorType: toolDefinitions.executorType,
          usageSchema: toolDefinitions.usageSchema,
        },
      })
      .from(appToolUsages)
      .innerJoin(toolInstances, eq(appToolUsages.toolInstanceId, toolInstances.id))
      .innerJoin(toolDefinitions, eq(toolInstances.toolDefinitionId, toolDefinitions.id))
      .where(eq(appToolUsages.appId, appId))
      .orderBy(toolDefinitions.category, toolDefinitions.displayName)

    return results.map((r) => ({
      ...r.usage,
      instance: r.instance as AppToolUsageWithInstance['instance'],
      definition: {
        ...r.definition,
        usageSchema: r.definition.usageSchema as JsonSchema,
      },
    }))
  },

  async findById(id: string): Promise<AppToolUsageWithInstance | null> {
    const results = await db
      .select({
        usage: appToolUsages,
        instance: {
          id: toolInstances.id,
          name: toolInstances.name,
          toolDefinitionId: toolInstances.toolDefinitionId,
          config: toolInstances.config,
        },
        definition: {
          id: toolDefinitions.id,
          name: toolDefinitions.name,
          displayName: toolDefinitions.displayName,
          category: toolDefinitions.category,
          executorType: toolDefinitions.executorType,
          usageSchema: toolDefinitions.usageSchema,
        },
      })
      .from(appToolUsages)
      .innerJoin(toolInstances, eq(appToolUsages.toolInstanceId, toolInstances.id))
      .innerJoin(toolDefinitions, eq(toolInstances.toolDefinitionId, toolDefinitions.id))
      .where(eq(appToolUsages.id, id))

    if (results.length === 0) return null

    return {
      ...results[0].usage,
      instance: results[0].instance as AppToolUsageWithInstance['instance'],
      definition: {
        ...results[0].definition,
        usageSchema: results[0].definition.usageSchema as JsonSchema,
      },
    }
  },

  async findByAppAndInstance(appId: string, instanceId: string): Promise<AppToolUsageWithInstance | null> {
    const results = await db
      .select({
        usage: appToolUsages,
        instance: {
          id: toolInstances.id,
          name: toolInstances.name,
          toolDefinitionId: toolInstances.toolDefinitionId,
          config: toolInstances.config,
        },
        definition: {
          id: toolDefinitions.id,
          name: toolDefinitions.name,
          displayName: toolDefinitions.displayName,
          category: toolDefinitions.category,
          executorType: toolDefinitions.executorType,
          usageSchema: toolDefinitions.usageSchema,
        },
      })
      .from(appToolUsages)
      .innerJoin(toolInstances, eq(appToolUsages.toolInstanceId, toolInstances.id))
      .innerJoin(toolDefinitions, eq(toolInstances.toolDefinitionId, toolDefinitions.id))
      .where(and(eq(appToolUsages.appId, appId), eq(appToolUsages.toolInstanceId, instanceId)))

    if (results.length === 0) return null

    return {
      ...results[0].usage,
      instance: results[0].instance as AppToolUsageWithInstance['instance'],
      definition: {
        ...results[0].definition,
        usageSchema: results[0].definition.usageSchema as JsonSchema,
      },
    }
  },

  async create(usage: NewAppToolUsage): Promise<AppToolUsageRow> {
    const results = await db.insert(appToolUsages).values(usage).returning()
    return results[0]
  },

  async update(id: string, updates: Partial<Omit<NewAppToolUsage, 'id'>>): Promise<AppToolUsageRow | null> {
    const results = await db
      .update(appToolUsages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(appToolUsages.id, id))
      .returning()
    return results[0] || null
  },

  async upsert(appId: string, instanceId: string, updates: Partial<Omit<NewAppToolUsage, 'id' | 'appId' | 'toolInstanceId'>>): Promise<AppToolUsageRow> {
    const existing = await this.findByAppAndInstance(appId, instanceId)
    
    if (existing) {
      const updated = await this.update(existing.id, updates)
      return updated!
    }

    return this.create({
      id: `atu-${Date.now()}`,
      appId,
      toolInstanceId: instanceId,
      enabled: updates.enabled ?? true,
      usageConfig: updates.usageConfig ?? {},
    })
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(appToolUsages).where(eq(appToolUsages.id, id)).returning()
    return result.length > 0
  },

  async deleteByAppId(appId: string): Promise<number> {
    const result = await db.delete(appToolUsages).where(eq(appToolUsages.appId, appId)).returning()
    return result.length
  },
}
