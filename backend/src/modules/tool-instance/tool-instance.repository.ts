import { db } from '../../db'
import { toolInstances, toolDefinitions, type ToolInstanceRow, type NewToolInstance, type JsonSchema } from '../../db/schema'
import { eq } from 'drizzle-orm'

export interface ToolInstanceWithDefinition extends ToolInstanceRow {
  definition: {
    id: string
    name: string
    displayName: string
    category: string
    executorType: string
    configSchema: JsonSchema
    usageSchema: JsonSchema
    builtIn: boolean
  }
}

export const toolInstanceRepository = {
  async findAll(): Promise<ToolInstanceWithDefinition[]> {
    const results = await db
      .select({
        instance: toolInstances,
        definition: {
          id: toolDefinitions.id,
          name: toolDefinitions.name,
          displayName: toolDefinitions.displayName,
          category: toolDefinitions.category,
          executorType: toolDefinitions.executorType,
          configSchema: toolDefinitions.configSchema,
          usageSchema: toolDefinitions.usageSchema,
          builtIn: toolDefinitions.builtIn,
        },
      })
      .from(toolInstances)
      .innerJoin(toolDefinitions, eq(toolInstances.toolDefinitionId, toolDefinitions.id))
      .orderBy(toolDefinitions.category, toolInstances.name)

    return results.map((r) => ({
      ...r.instance,
      definition: r.definition as ToolInstanceWithDefinition['definition'],
    }))
  },

  async findById(id: string): Promise<ToolInstanceWithDefinition | null> {
    const results = await db
      .select({
        instance: toolInstances,
        definition: {
          id: toolDefinitions.id,
          name: toolDefinitions.name,
          displayName: toolDefinitions.displayName,
          category: toolDefinitions.category,
          executorType: toolDefinitions.executorType,
          configSchema: toolDefinitions.configSchema,
          usageSchema: toolDefinitions.usageSchema,
          builtIn: toolDefinitions.builtIn,
        },
      })
      .from(toolInstances)
      .innerJoin(toolDefinitions, eq(toolInstances.toolDefinitionId, toolDefinitions.id))
      .where(eq(toolInstances.id, id))

    if (results.length === 0) return null

    return {
      ...results[0].instance,
      definition: {
        ...results[0].definition,
        configSchema: results[0].definition.configSchema as JsonSchema,
        usageSchema: results[0].definition.usageSchema as JsonSchema,
      },
    }
  },

  async findByDefinitionId(definitionId: string): Promise<ToolInstanceWithDefinition[]> {
    const results = await db
      .select({
        instance: toolInstances,
        definition: {
          id: toolDefinitions.id,
          name: toolDefinitions.name,
          displayName: toolDefinitions.displayName,
          category: toolDefinitions.category,
          executorType: toolDefinitions.executorType,
          configSchema: toolDefinitions.configSchema,
          usageSchema: toolDefinitions.usageSchema,
          builtIn: toolDefinitions.builtIn,
        },
      })
      .from(toolInstances)
      .innerJoin(toolDefinitions, eq(toolInstances.toolDefinitionId, toolDefinitions.id))
      .where(eq(toolInstances.toolDefinitionId, definitionId))

    return results.map((r) => ({
      ...r.instance,
      definition: {
        ...r.definition,
        configSchema: r.definition.configSchema as JsonSchema,
        usageSchema: r.definition.usageSchema as JsonSchema,
      },
    }))
  },

  async create(instance: NewToolInstance): Promise<ToolInstanceRow> {
    const results = await db.insert(toolInstances).values(instance).returning()
    return results[0]
  },

  async update(id: string, updates: Partial<Omit<NewToolInstance, 'id'>>): Promise<ToolInstanceRow | null> {
    const results = await db
      .update(toolInstances)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(toolInstances.id, id))
      .returning()
    return results[0] || null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(toolInstances).where(eq(toolInstances.id, id)).returning()
    return result.length > 0
  },
}
