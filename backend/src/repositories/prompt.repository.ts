import { db, schema } from '../db'
import { eq, desc, and, sql } from 'drizzle-orm'
import type { PromptVersion, Vendor, ResponseFormat } from '../types'

export const promptRepository = {
  async create(data: {
    id: string
    analysisId: string
    version: number
    systemPrompt: string
    vendor: Vendor
    model: string
    temperature: number
    maxTokens: number
    responseFormat: ResponseFormat
    publishedAt?: Date | null
  }): Promise<PromptVersion> {
    const [version] = await db
      .insert(schema.promptVersions)
      .values({
        id: data.id,
        analysisId: data.analysisId,
        version: data.version,
        systemPrompt: data.systemPrompt,
        provider: data.vendor,
        model: data.model,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        responseFormat: data.responseFormat,
        publishedAt: data.publishedAt,
        createdAt: new Date(),
        createdBy: 'system',
      })
      .returning()
    return {
      ...version,
      vendor: version.provider as Vendor,
    }
  },

  async findByAnalysisId(analysisId: string): Promise<PromptVersion[]> {
    const results = await db
      .select()
      .from(schema.promptVersions)
      .where(eq(schema.promptVersions.analysisId, analysisId))
      .orderBy(desc(schema.promptVersions.version))
    return results.map((r) => ({ ...r, vendor: r.provider as Vendor }))
  },

  async findById(analysisId: string, promptId: string): Promise<PromptVersion | null> {
    const [version] = await db
      .select()
      .from(schema.promptVersions)
      .where(
        and(
          eq(schema.promptVersions.analysisId, analysisId),
          eq(schema.promptVersions.id, promptId)
        )
      )
      .limit(1)
    if (!version) return null
    return { ...version, vendor: version.provider as Vendor }
  },

  async findByIdOnly(promptId: string): Promise<PromptVersion | null> {
    const [version] = await db
      .select()
      .from(schema.promptVersions)
      .where(eq(schema.promptVersions.id, promptId))
      .limit(1)
    if (!version) return null
    return { ...version, vendor: version.provider as Vendor }
  },

  async findByVersionNumber(analysisId: string, versionNumber: number): Promise<PromptVersion | null> {
    const [version] = await db
      .select()
      .from(schema.promptVersions)
      .where(
        and(
          eq(schema.promptVersions.analysisId, analysisId),
          eq(schema.promptVersions.version, versionNumber)
        )
      )
      .limit(1)
    if (!version) return null
    return { ...version, vendor: version.provider as Vendor }
  },

  async findLatest(analysisId: string): Promise<PromptVersion | null> {
    const [version] = await db
      .select()
      .from(schema.promptVersions)
      .where(eq(schema.promptVersions.analysisId, analysisId))
      .orderBy(desc(schema.promptVersions.version))
      .limit(1)
    if (!version) return null
    return { ...version, vendor: version.provider as Vendor }
  },

  async getMaxVersion(analysisId: string): Promise<number> {
    const [result] = await db
      .select({ max: sql<number>`coalesce(max(${schema.promptVersions.version}), 0)` })
      .from(schema.promptVersions)
      .where(eq(schema.promptVersions.analysisId, analysisId))
    return result?.max || 0
  },

  async publish(analysisId: string, promptId: string): Promise<PromptVersion | null> {
    const [version] = await db
      .update(schema.promptVersions)
      .set({ publishedAt: new Date() })
      .where(
        and(
          eq(schema.promptVersions.analysisId, analysisId),
          eq(schema.promptVersions.id, promptId)
        )
      )
      .returning()
    if (!version) return null
    return { ...version, vendor: version.provider as Vendor }
  },
}
