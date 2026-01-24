import { CronJob } from 'cron'
import { scheduleService } from './schedule.service'
import { executionService } from '../execution/execution.service'
import type { ScheduledRunRow } from '../../db/schema'

const MAX_CONCURRENT_JOBS = parseInt(
  process.env.SCHEDULE_MAX_CONCURRENT_JOBS || '10',
  10,
)
const JOB_TIMEOUT_MS = parseInt(
  process.env.SCHEDULE_JOB_TIMEOUT_MS || '300000',
  10,
)

let activeJobs = 0
let isProcessing = false

async function createPendingRuns(): Promise<void> {
  try {
    const dueSchedules = await scheduleService.getDueSchedules(100)

    for (const schedule of dueSchedules) {
      try {
        await scheduleService.createScheduledRunForSchedule(schedule)
      } catch (error) {
      }
    }
  } catch (error) {
  }
}

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Job timeout')), ms)
  })
}

async function processRun(run: ScheduledRunRow): Promise<void> {
  activeJobs++

  try {
    const scheduleInfo = await scheduleService.getScheduleWithApp(run.scheduleId)
    if (!scheduleInfo) {
      throw new Error(`Schedule not found for run ${run.id}`)
    }

    const { appId, inputData } = scheduleInfo
    const safeInput = inputData && typeof inputData === 'object' ? inputData : {}

    const result = await Promise.race([
      executionService.execute(appId, { input: safeInput }, 'scheduled'),
      timeout(JOB_TIMEOUT_MS),
    ])

    await scheduleService.markRunCompleted(run.id, result.id)
  } catch (error) {
    const errorMessage =
      (error as Error).message === 'Job timeout'
        ? `Job timed out after ${JOB_TIMEOUT_MS}ms`
        : (error as Error).message

    await scheduleService.markRunFailed(run.id, errorMessage)
  } finally {
    activeJobs--
  }
}

async function tick(): Promise<void> {
  if (isProcessing) {
    return
  }

  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return
  }

  isProcessing = true

  try {
    await createPendingRuns()

    const availableSlots = MAX_CONCURRENT_JOBS - activeJobs
    if (availableSlots <= 0) {
      return
    }

    const claimedRuns = await scheduleService.claimPendingRuns(availableSlots)

    for (const run of claimedRuns) {
      processRun(run)
    }
  } catch (error) {
  } finally {
    isProcessing = false
  }
}

let cronJob: CronJob | null = null

export function startScheduleProcessor(): void {
  if (cronJob) {
    return
  }

  cronJob = new CronJob(
    '* * * * *',
    tick,
    null,
    true,
    'UTC',
  )
}

export function stopScheduleProcessor(): void {
  if (cronJob) {
    cronJob.stop()
    cronJob = null
  }
}

export function getProcessorStatus(): { activeJobs: number; maxConcurrent: number; isRunning: boolean } {
  return {
    activeJobs,
    maxConcurrent: MAX_CONCURRENT_JOBS,
    isRunning: cronJob !== null,
  }
}
