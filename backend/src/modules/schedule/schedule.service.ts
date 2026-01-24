import { nanoid } from 'nanoid'
import { CronExpressionParser } from 'cron-parser'
import { scheduleRepository } from './schedule.repository'
import { appRepository } from '../app/app.repository'
import type { AppScheduleRow, ScheduledRunRow } from '../../db/schema'

function generateScheduleId(): string {
  return `sch-${nanoid(10)}`
}

function generateRunId(): string {
  return `run-${nanoid(10)}`
}

function calculateNextRunAt(cronExpression: string, timezone: string): Date {
  const parser = CronExpressionParser.parse(cronExpression, {
    tz: timezone,
    currentDate: new Date(),
  })
  return parser.next().toDate()
}

export interface CreateScheduleDto {
  appId: string
  cronExpression: string
  timezone?: string
  enabled?: boolean
  inputData?: Record<string, unknown> | null
}

export interface UpdateScheduleDto {
  cronExpression?: string
  timezone?: string
  enabled?: boolean
  inputData?: Record<string, unknown> | null
}

export const scheduleService = {
  async create(dto: CreateScheduleDto): Promise<AppScheduleRow> {
    const app = await appRepository.findById(dto.appId)
    if (!app) {
      throw new Error(`App with ID "${dto.appId}" not found`)
    }

    const existing = await scheduleRepository.findScheduleByAppId(dto.appId)
    if (existing) {
      throw new Error(`Schedule already exists for app "${dto.appId}". Use update instead.`)
    }

    const timezone = dto.timezone || 'UTC'
    let nextRunAt: Date

    try {
      nextRunAt = calculateNextRunAt(dto.cronExpression, timezone)
    } catch (error) {
      throw new Error(`Invalid cron expression: ${dto.cronExpression}`)
    }

    const schedule = await scheduleRepository.createSchedule({
      id: generateScheduleId(),
      appId: dto.appId,
      cronExpression: dto.cronExpression,
      timezone,
      enabled: dto.enabled ?? true,
      inputData: dto.inputData ?? null,
      nextRunAt,
    })

    return schedule
  },

  async findByAppId(appId: string): Promise<AppScheduleRow | null> {
    return scheduleRepository.findScheduleByAppId(appId)
  },

  async findById(id: string): Promise<AppScheduleRow | null> {
    return scheduleRepository.findScheduleById(id)
  },

  async update(id: string, dto: UpdateScheduleDto): Promise<AppScheduleRow | null> {
    const existing = await scheduleRepository.findScheduleById(id)
    if (!existing) {
      return null
    }

    const updateData: Partial<AppScheduleRow> = {}

    if (dto.cronExpression !== undefined) {
      updateData.cronExpression = dto.cronExpression
    }
    if (dto.timezone !== undefined) {
      updateData.timezone = dto.timezone
    }
    if (dto.enabled !== undefined) {
      updateData.enabled = dto.enabled
    }
    if (dto.inputData !== undefined) {
      updateData.inputData = dto.inputData ?? null
    }

    const cronExpr = dto.cronExpression || existing.cronExpression
    const tz = dto.timezone || existing.timezone

    try {
      updateData.nextRunAt = calculateNextRunAt(cronExpr, tz)
    } catch (error) {
      throw new Error(`Invalid cron expression: ${cronExpr}`)
    }

    const updated = await scheduleRepository.updateSchedule(id, updateData)
    return updated
  },

  async delete(id: string): Promise<boolean> {
    const existing = await scheduleRepository.findScheduleById(id)
    if (!existing) {
      return false
    }
    await scheduleRepository.deleteSchedule(id)
    return true
  },

  async getScheduledRuns(
    appId: string,
    options: { limit: number; offset: number } = { limit: 50, offset: 0 },
  ): Promise<{ runs: ScheduledRunRow[]; total: number }> {
    const schedule = await scheduleRepository.findScheduleByAppId(appId)
    if (!schedule) {
      return { runs: [], total: 0 }
    }

    const runs = await scheduleRepository.findScheduledRunsByScheduleId(
      schedule.id,
      options,
    )
    const total = await scheduleRepository.countScheduledRunsByScheduleId(
      schedule.id,
    )

    return { runs, total }
  },

  async triggerManually(id: string): Promise<ScheduledRunRow> {
    const schedule = await scheduleRepository.findScheduleById(id)
    if (!schedule) {
      throw new Error(`Schedule with ID "${id}" not found`)
    }

    const run = await scheduleRepository.createScheduledRun({
      id: generateRunId(),
      scheduleId: schedule.id,
      status: 'pending',
      scheduledFor: new Date(),
    })

    return run
  },

  async createScheduledRunForSchedule(schedule: AppScheduleRow): Promise<ScheduledRunRow> {
    const run = await scheduleRepository.createScheduledRun({
      id: generateRunId(),
      scheduleId: schedule.id,
      status: 'pending',
      scheduledFor: schedule.nextRunAt || new Date(),
    })

    const nextRunAt = calculateNextRunAt(schedule.cronExpression, schedule.timezone)
    await scheduleRepository.updateSchedule(schedule.id, { nextRunAt })

    return run
  },

  async getDueSchedules(limit: number): Promise<AppScheduleRow[]> {
    return scheduleRepository.findDueSchedules(limit)
  },

  async claimPendingRuns(limit: number): Promise<ScheduledRunRow[]> {
    return scheduleRepository.claimPendingRuns(limit)
  },

  async markRunCompleted(
    runId: string,
    executionLogId: string,
  ): Promise<ScheduledRunRow | null> {
    const run = await scheduleRepository.markRunCompleted(runId, executionLogId)

    if (run) {
      const schedule = await scheduleRepository.findScheduleById(run.scheduleId)
      if (schedule) {
        await scheduleRepository.updateSchedule(schedule.id, {
          lastRunAt: new Date(),
        })
      }
    }

    return run
  },

  async markRunFailed(
    runId: string,
    errorMessage: string,
  ): Promise<ScheduledRunRow | null> {
    return scheduleRepository.markRunFailed(runId, errorMessage)
  },

  async getScheduleWithApp(
    scheduleId: string,
  ): Promise<{ schedule: AppScheduleRow; appId: string; inputData: Record<string, unknown> | null } | null> {
    const schedule = await scheduleRepository.findScheduleById(scheduleId)
    if (!schedule) {
      return null
    }
    
    if (schedule.inputData && Object.keys(schedule.inputData).length > 0) {
      return {
        schedule,
        appId: schedule.appId,
        inputData: schedule.inputData,
      }
    }
    
    const app = await appRepository.findById(schedule.appId)
    if (app?.sampleData) {
      try {
        const parsedSampleData = JSON.parse(app.sampleData)
        const inputData = typeof parsedSampleData === 'string' 
          ? { data: parsedSampleData }
          : parsedSampleData
        return {
          schedule,
          appId: schedule.appId,
          inputData,
        }
      } catch (e) {
        return {
          schedule,
          appId: schedule.appId,
          inputData: { data: app.sampleData },
        }
      }
    }
    
    return {
      schedule,
      appId: schedule.appId,
      inputData: null,
    }
  },

  async getStats(
    appId: string,
  ): Promise<{ totalRuns: number; successfulRuns: number; failedRuns: number } | null> {
    const schedule = await scheduleRepository.findScheduleByAppId(appId)
    if (!schedule) {
      return null
    }
    return scheduleRepository.getScheduleStats(schedule.id)
  },

  async deleteRun(runId: string): Promise<boolean> {
    return scheduleRepository.deleteScheduledRun(runId)
  },

  async deleteAllRuns(appId: string): Promise<void> {
    const schedule = await scheduleRepository.findScheduleByAppId(appId)
    if (schedule) {
      await scheduleRepository.deleteAllScheduledRuns(schedule.id)
    }
  },

  async findAll(): Promise<AppScheduleRow[]> {
    return scheduleRepository.findAllSchedules()
  },

  async getAppNameForSchedule(scheduleId: string): Promise<{ name: string } | null> {
    const schedule = await scheduleRepository.findScheduleById(scheduleId)
    if (!schedule) return null
    
    const app = await appRepository.findById(schedule.appId)
    if (!app) return null
    
    return { name: app.name }
  },
}
