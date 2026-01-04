import { db, schema } from '../db'
import { eq, desc, sql } from 'drizzle-orm'
import type { ExecutionLog, ExecutionStatus } from '../types'

export const executionRepository = {
  async create(data: {
    id: string
    analysisId: string
    versionId: string | null
    input: Record<string, unknown>
    output: Record<string, unknown> | null
    rawResponse: string | null
    latencyMs: number
    tokenUsage: { prompt: number; completion: number; total: number } | null
    status: ExecutionStatus
    errorMessage?: string | null
    callerService?: string | null
  }): Promise<ExecutionLog> {
    const [log] = await db
      .insert(schema.executionLogs)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning()
    return log as ExecutionLog
  },

  async findById(id: string): Promise<ExecutionLog | null> {
    const [log] = await db
      .select()
      .from(schema.executionLogs)
      .where(eq(schema.executionLogs.id, id))
      .limit(1)
    return (log as ExecutionLog) || null
  },

  async findByAnalysisId(analysisId: string, limit: number, offset: number): Promise<{ logs: ExecutionLog[]; total: number }> {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.executionLogs)
      .where(eq(schema.executionLogs.analysisId, analysisId))

    const logs = await db
      .select()
      .from(schema.executionLogs)
      .where(eq(schema.executionLogs.analysisId, analysisId))
      .orderBy(desc(schema.executionLogs.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      logs: logs as ExecutionLog[],
      total: countResult?.count || 0,
    }
  },

  async findRecent(limit: number): Promise<ExecutionLog[]> {
    const logs = await db
      .select()
      .from(schema.executionLogs)
      .orderBy(desc(schema.executionLogs.createdAt))
      .limit(limit)
    return logs as ExecutionLog[]
  },

  async getStatsForAnalysis(analysisId: string): Promise<{
    totalExecutions: number
    successCount: number
    errorCount: number
    avgLatencyMs: number
    totalTokens: number
  }> {
    const [result] = await db
      .select({
        totalExecutions: sql<number>`count(*)::int`,
        successCount: sql<number>`count(*) filter (where ${schema.executionLogs.status} = 'success')::int`,
        errorCount: sql<number>`count(*) filter (where ${schema.executionLogs.status} = 'error')::int`,
        avgLatencyMs: sql<number>`coalesce(avg(${schema.executionLogs.latencyMs})::int, 0)`,
        totalTokens: sql<number>`coalesce(sum((${schema.executionLogs.tokenUsage}->>'total')::int), 0)::int`,
      })
      .from(schema.executionLogs)
      .where(eq(schema.executionLogs.analysisId, analysisId))

    return result || {
      totalExecutions: 0,
      successCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      totalTokens: 0,
    }
  },

  async getGlobalStats(): Promise<{
    totalExecutions: number
    successCount: number
    avgLatencyMs: number
    totalTokens: number
  }> {
    const [result] = await db
      .select({
        totalExecutions: sql<number>`count(*)::int`,
        successCount: sql<number>`count(*) filter (where ${schema.executionLogs.status} = 'success')::int`,
        avgLatencyMs: sql<number>`coalesce(avg(${schema.executionLogs.latencyMs})::int, 0)`,
        totalTokens: sql<number>`coalesce(sum((${schema.executionLogs.tokenUsage}->>'total')::int), 0)::int`,
      })
      .from(schema.executionLogs)

    return result || {
      totalExecutions: 0,
      successCount: 0,
      avgLatencyMs: 0,
      totalTokens: 0,
    }
  },
}
