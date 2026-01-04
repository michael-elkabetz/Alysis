import { db, schema } from '../db'
import { eq, desc, like, sql } from 'drizzle-orm'
import type { Analysis, AnalysisStatus } from '../types'

export const analysisRepository = {
  async create(data: {
    id: string
    name: string
    description: string | null
    status: AnalysisStatus
  }): Promise<Analysis> {
    const now = new Date()
    const [analysis] = await db
      .insert(schema.analyses)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
    return analysis
  },

  async findAll(search?: string): Promise<Analysis[]> {
    let query = db.select().from(schema.analyses).orderBy(desc(schema.analyses.updatedAt))
    if (search) {
      query = query.where(like(schema.analyses.name, `%${search}%`)) as typeof query
    }
    return query
  },

  async findActive(): Promise<Analysis[]> {
    return db
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.status, 'active'))
      .orderBy(desc(schema.analyses.updatedAt))
  },

  async findById(id: string): Promise<Analysis | null> {
    const [analysis] = await db
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.id, id))
      .limit(1)
    return analysis || null
  },

  async update(id: string, data: Partial<{ name: string; description: string; status: AnalysisStatus; activeVersionId: string }>): Promise<Analysis | null> {
    const [updated] = await db
      .update(schema.analyses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.analyses.id, id))
      .returning()
    return updated || null
  },

  async delete(id: string): Promise<boolean> {
    await db.delete(schema.analyses).where(eq(schema.analyses.id, id))
    return true
  },

  async count(): Promise<{ total: number; active: number }> {
    const [result] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${schema.analyses.status} = 'active')::int`,
      })
      .from(schema.analyses)
    return result || { total: 0, active: 0 }
  },
}
