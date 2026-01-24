import { db, schema } from '../../db'
import { eq, desc, and, lte, sql, inArray } from 'drizzle-orm'
import type { AppScheduleRow, NewAppSchedule, ScheduledRunRow, NewScheduledRun } from '../../db/schema'

export const scheduleRepository = {
  async createSchedule(data: NewAppSchedule): Promise<AppScheduleRow> {
    const [schedule] = await db
      .insert(schema.appSchedules)
      .values({
        id: data.id,
        appId: data.appId,
        cronExpression: data.cronExpression,
        timezone: data.timezone,
        enabled: data.enabled,
        inputData: data.inputData ?? null,
        nextRunAt: data.nextRunAt ?? null,
        lastRunAt: data.lastRunAt ?? null,
      })
      .returning()
    return schedule
  },

  async findScheduleById(id: string): Promise<AppScheduleRow | null> {
    const [schedule] = await db
      .select()
      .from(schema.appSchedules)
      .where(eq(schema.appSchedules.id, id))
      .limit(1)
    return schedule || null
  },

  async findScheduleByAppId(appId: string): Promise<AppScheduleRow | null> {
    const [schedule] = await db
      .select()
      .from(schema.appSchedules)
      .where(eq(schema.appSchedules.appId, appId))
      .limit(1)
    return schedule || null
  },

  async updateSchedule(
    id: string,
    data: Partial<NewAppSchedule>,
  ): Promise<AppScheduleRow | null> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    
    if (data.cronExpression !== undefined) updateData.cronExpression = data.cronExpression
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.enabled !== undefined) updateData.enabled = data.enabled
    if (data.inputData !== undefined) updateData.inputData = data.inputData ?? null
    if (data.nextRunAt !== undefined) updateData.nextRunAt = data.nextRunAt ?? null
    if (data.lastRunAt !== undefined) updateData.lastRunAt = data.lastRunAt ?? null
    
    const [updated] = await db
      .update(schema.appSchedules)
      .set(updateData)
      .where(eq(schema.appSchedules.id, id))
      .returning()
    return updated || null
  },

  async deleteSchedule(id: string): Promise<boolean> {
    await db.delete(schema.appSchedules).where(eq(schema.appSchedules.id, id))
    return true
  },

  async findDueSchedules(limit: number): Promise<AppScheduleRow[]> {
    return db
      .select()
      .from(schema.appSchedules)
      .where(
        and(
          eq(schema.appSchedules.enabled, true),
          lte(schema.appSchedules.nextRunAt, new Date()),
        ),
      )
      .limit(limit)
  },

  async createScheduledRun(data: NewScheduledRun): Promise<ScheduledRunRow> {
    const [run] = await db
      .insert(schema.scheduledRuns)
      .values({
        id: data.id,
        scheduleId: data.scheduleId,
        executionLogId: data.executionLogId ?? null,
        status: data.status,
        scheduledFor: data.scheduledFor,
        startedAt: data.startedAt ?? null,
        completedAt: data.completedAt ?? null,
        errorMessage: data.errorMessage ?? null,
      })
      .returning()
    return run
  },

  async findScheduledRunById(id: string): Promise<ScheduledRunRow | null> {
    const [run] = await db
      .select()
      .from(schema.scheduledRuns)
      .where(eq(schema.scheduledRuns.id, id))
      .limit(1)
    return run || null
  },

  async findScheduledRunsByScheduleId(
    scheduleId: string,
    options: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ): Promise<ScheduledRunRow[]> {
    return db
      .select()
      .from(schema.scheduledRuns)
      .where(eq(schema.scheduledRuns.scheduleId, scheduleId))
      .orderBy(desc(schema.scheduledRuns.createdAt))
      .limit(options.limit)
      .offset(options.offset)
  },

  async countScheduledRunsByScheduleId(scheduleId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.scheduledRuns)
      .where(eq(schema.scheduledRuns.scheduleId, scheduleId))
    return result?.count || 0
  },

  async claimPendingRuns(limit: number): Promise<ScheduledRunRow[]> {
    return db.transaction(async (tx) => {
      const pendingRuns = await tx.execute(sql`
        SELECT 
          sr.id as id,
          sr.schedule_id as "scheduleId",
          sr.execution_log_id as "executionLogId",
          sr.status as status,
          sr.scheduled_for as "scheduledFor",
          sr.started_at as "startedAt",
          sr.completed_at as "completedAt",
          sr.error_message as "errorMessage",
          sr.created_at as "createdAt"
        FROM scheduled_runs sr
        JOIN app_schedules s ON sr.schedule_id = s.id
        WHERE sr.status = 'pending'
          AND sr.scheduled_for <= NOW()
          AND s.enabled = true
        ORDER BY sr.scheduled_for ASC
        LIMIT ${limit}
        FOR UPDATE OF sr SKIP LOCKED
      `)

      if (pendingRuns.length === 0) {
        return []
      }

      const runIds = pendingRuns.map((r: { id: string }) => r.id)

      await tx
        .update(schema.scheduledRuns)
        .set({ status: 'running', startedAt: new Date() })
        .where(inArray(schema.scheduledRuns.id, runIds))

      return pendingRuns as ScheduledRunRow[]
    })
  },

  async markRunCompleted(
    runId: string,
    executionLogId: string,
  ): Promise<ScheduledRunRow | null> {
    const [updated] = await db
      .update(schema.scheduledRuns)
      .set({
        status: 'completed',
        executionLogId,
        completedAt: new Date(),
      })
      .where(eq(schema.scheduledRuns.id, runId))
      .returning()
    return updated || null
  },

  async markRunFailed(
    runId: string,
    errorMessage: string,
  ): Promise<ScheduledRunRow | null> {
    const [updated] = await db
      .update(schema.scheduledRuns)
      .set({
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(schema.scheduledRuns.id, runId))
      .returning()
    return updated || null
  },

  async getScheduleStats(scheduleId: string): Promise<{
    totalRuns: number
    successfulRuns: number
    failedRuns: number
  }> {
    const [result] = await db
      .select({
        totalRuns: sql<number>`count(*)::int`,
        successfulRuns: sql<number>`count(*) filter (where ${schema.scheduledRuns.status} = 'completed')::int`,
        failedRuns: sql<number>`count(*) filter (where ${schema.scheduledRuns.status} = 'failed')::int`,
      })
      .from(schema.scheduledRuns)
      .where(eq(schema.scheduledRuns.scheduleId, scheduleId))

    return result || { totalRuns: 0, successfulRuns: 0, failedRuns: 0 }
  },

  async deleteScheduledRun(runId: string): Promise<boolean> {
    const result = await db
      .delete(schema.scheduledRuns)
      .where(eq(schema.scheduledRuns.id, runId))
      .returning()
    return result.length > 0
  },

  async deleteAllScheduledRuns(scheduleId: string): Promise<void> {
    await db
      .delete(schema.scheduledRuns)
      .where(eq(schema.scheduledRuns.scheduleId, scheduleId))
  },

  async findAllSchedules(): Promise<AppScheduleRow[]> {
    return db.select().from(schema.appSchedules)
  },
}
