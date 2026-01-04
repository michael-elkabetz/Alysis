import { db, schema } from '../db'
import { eq } from 'drizzle-orm'

export interface ApiKeyRecord {
  id: string
  name: string
  keyHash: string
  analysisId: string | null
  createdAt: Date
  lastUsedAt: Date | null
}

export const apiKeyRepository = {
  async create(data: {
    id: string
    name: string
    keyHash: string
    analysisId: string | null
  }): Promise<ApiKeyRecord> {
    const [apiKey] = await db
      .insert(schema.apiKeys)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning()
    return apiKey
  },

  async findByHash(keyHash: string): Promise<ApiKeyRecord | null> {
    const [apiKey] = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.keyHash, keyHash))
      .limit(1)
    return apiKey || null
  },

  async findById(id: string): Promise<ApiKeyRecord | null> {
    const [apiKey] = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.id, id))
      .limit(1)
    return apiKey || null
  },

  async findByAnalysisId(analysisId: string): Promise<Array<{ id: string; name: string; createdAt: Date; lastUsedAt: Date | null }>> {
    return db
      .select({
        id: schema.apiKeys.id,
        name: schema.apiKeys.name,
        createdAt: schema.apiKeys.createdAt,
        lastUsedAt: schema.apiKeys.lastUsedAt,
      })
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.analysisId, analysisId))
  },

  async updateLastUsed(id: string): Promise<void> {
    await db
      .update(schema.apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.apiKeys.id, id))
  },

  async updateKeyHash(id: string, keyHash: string): Promise<ApiKeyRecord | null> {
    const [updated] = await db
      .update(schema.apiKeys)
      .set({ keyHash })
      .where(eq(schema.apiKeys.id, id))
      .returning()
    return updated || null
  },

  async delete(id: string): Promise<boolean> {
    await db.delete(schema.apiKeys).where(eq(schema.apiKeys.id, id))
    return true
  },
}
