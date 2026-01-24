import { Elysia, t } from 'elysia'
import { scheduleService } from './schedule.service'
import { handleControllerError } from '../../utils/http'

export const scheduleController = new Elysia({ prefix: '/api/v1/schedules' })
  .get('/', async () => {
    return scheduleService.findAll()
  }, {
    detail: { tags: ['Schedules'], summary: 'Get all schedules' },
  })

  .post('/', async ({ body, set }) => {
    try {
      const schedule = await scheduleService.create(body)
      set.status = 201
      return schedule
    } catch (error) {
      return handleControllerError(error, set, 'Failed to create schedule')
    }
  }, {
    body: t.Object({
      appId: t.String(),
      cronExpression: t.String(),
      timezone: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
      inputData: t.Optional(t.Record(t.String(), t.Unknown())),
    }),
    detail: { tags: ['Schedules'], summary: 'Create a schedule for an app' },
  })

  .get('/app/:appId', async ({ params }) => {
    const schedule = await scheduleService.findByAppId(params.appId)
    const stats = await scheduleService.getStats(params.appId)
    return { schedule, stats }
  }, {
    params: t.Object({ appId: t.String() }),
    detail: { tags: ['Schedules'], summary: 'Get schedule for an app' },
  })

  .get('/app/:appId/runs', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    const offset = query.offset ? parseInt(query.offset) : 0
    return scheduleService.getScheduledRuns(params.appId, { limit, offset })
  }, {
    params: t.Object({ appId: t.String() }),
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: { tags: ['Schedules'], summary: 'Get scheduled runs for an app' },
  })

  .get('/:id', async ({ params, set }) => {
    const schedule = await scheduleService.findById(params.id)
    if (!schedule) {
      set.status = 404
      return { error: 'Schedule not found' }
    }
    return schedule
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Schedules'], summary: 'Get schedule by ID' },
  })

  .patch('/:id', async ({ params, body, set }) => {
    try {
      const schedule = await scheduleService.update(params.id, body)
      if (!schedule) {
        set.status = 404
        return { error: 'Schedule not found' }
      }
      return schedule
    } catch (error) {
      return handleControllerError(error, set, 'Failed to update schedule')
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      cronExpression: t.Optional(t.String()),
      timezone: t.Optional(t.String()),
      enabled: t.Optional(t.Boolean()),
      inputData: t.Optional(t.Record(t.String(), t.Unknown())),
    }),
    detail: { tags: ['Schedules'], summary: 'Update a schedule' },
  })

  .delete('/:id', async ({ params, set }) => {
    const deleted = await scheduleService.delete(params.id)
    if (!deleted) {
      set.status = 404
      return { error: 'Schedule not found' }
    }
    set.status = 204
    return null
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Schedules'], summary: 'Delete a schedule' },
  })

  .post('/:id/trigger', async ({ params, set }) => {
    try {
      const run = await scheduleService.triggerManually(params.id)
      set.status = 201
      return run
    } catch (error) {
      return handleControllerError(error, set, 'Failed to trigger schedule')
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Schedules'], summary: 'Manually trigger a scheduled run' },
  })

  .delete('/app/:appId/runs', async ({ params, set }) => {
    try {
      await scheduleService.deleteAllRuns(params.appId)
      set.status = 204
      return null
    } catch (error) {
      return handleControllerError(error, set, 'Failed to delete runs')
    }
  }, {
    params: t.Object({ appId: t.String() }),
    detail: { tags: ['Schedules'], summary: 'Delete all runs for an app' },
  })

  .delete('/runs/:runId', async ({ params, set }) => {
    try {
      const deleted = await scheduleService.deleteRun(params.runId)
      if (!deleted) {
        set.status = 404
        return { error: 'Run not found' }
      }
      set.status = 204
      return null
    } catch (error) {
      return handleControllerError(error, set, 'Failed to delete run')
    }
  }, {
    params: t.Object({ runId: t.String() }),
    detail: { tags: ['Schedules'], summary: 'Delete a specific run' },
  })
