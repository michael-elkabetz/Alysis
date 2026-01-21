import { db } from '../../db'
import { toolDefinitions, type ToolDefinitionRow, type NewToolDefinition, type ToolCategory } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const toolDefinitionRepository = {
  async findAll(): Promise<ToolDefinitionRow[]> {
    return db.select().from(toolDefinitions).orderBy(toolDefinitions.category, toolDefinitions.displayName)
  },

  async findById(id: string): Promise<ToolDefinitionRow | null> {
    const results = await db.select().from(toolDefinitions).where(eq(toolDefinitions.id, id))
    return results[0] || null
  },

  async findByName(name: string): Promise<ToolDefinitionRow | null> {
    const results = await db.select().from(toolDefinitions).where(eq(toolDefinitions.name, name))
    return results[0] || null
  },

  async findByCategory(category: ToolCategory): Promise<ToolDefinitionRow[]> {
    return db.select().from(toolDefinitions).where(eq(toolDefinitions.category, category))
  },

  async findBuiltIn(): Promise<ToolDefinitionRow[]> {
    return db.select().from(toolDefinitions).where(eq(toolDefinitions.builtIn, true))
  },

  async create(definition: NewToolDefinition): Promise<ToolDefinitionRow> {
    const results = await db.insert(toolDefinitions).values(definition).returning()
    return results[0]
  },

  async update(id: string, updates: Partial<Omit<NewToolDefinition, 'id'>>): Promise<ToolDefinitionRow | null> {
    const results = await db
      .update(toolDefinitions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(toolDefinitions.id, id))
      .returning()
    return results[0] || null
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(toolDefinitions).where(eq(toolDefinitions.id, id)).returning()
    return result.length > 0
  },
}
