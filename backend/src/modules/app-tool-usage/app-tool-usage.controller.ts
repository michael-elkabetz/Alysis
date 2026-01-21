import { Elysia, t } from 'elysia'
import { appToolUsageService } from './app-tool-usage.service'

export const appToolUsageController = new Elysia({ prefix: '/api/v1/apps/:id/tools' })
  .get('/', async ({ params }) => {
    return appToolUsageService.getByAppId(params.id)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['App Tool Usage'], summary: 'List all tool usages for an app' },
  })

  .get('/:usageId', async ({ params, set }) => {
    const usage = await appToolUsageService.getById(params.usageId)

    if (!usage) {
      set.status = 404
      return { error: `App tool usage '${params.usageId}' not found` }
    }

    if (usage.appId !== params.id) {
      set.status = 404
      return { error: `App tool usage '${params.usageId}' not found for this app` }
    }

    return usage
  }, {
    params: t.Object({ id: t.String(), usageId: t.String() }),
    detail: { tags: ['App Tool Usage'], summary: 'Get tool usage by ID' },
  })

  .post('/', async ({ params, body, set }) => {
    try {
      const created = await appToolUsageService.create({
        appId: params.id,
        toolInstanceId: body.toolInstanceId,
        enabled: body.enabled,
        usageConfig: body.usageConfig,
      })

      set.status = 201
      return created
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add tool to app'
      if (message.includes('not found')) {
        set.status = 404
      } else if (message.includes('already has')) {
        set.status = 409
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      toolInstanceId: t.String({ minLength: 1 }),
      enabled: t.Optional(t.Boolean()),
      usageConfig: t.Record(t.String(), t.Any()),
    }),
    detail: { tags: ['App Tool Usage'], summary: 'Add a tool to an app' },
  })

  .put('/:usageId', async ({ params, body, set }) => {
    try {
      const existing = await appToolUsageService.getById(params.usageId)
      if (existing && existing.appId !== params.id) {
        set.status = 404
        return { error: `App tool usage '${params.usageId}' not found for this app` }
      }

      const updated = await appToolUsageService.update(params.usageId, {
        enabled: body.enabled,
        usageConfig: body.usageConfig,
      })

      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tool usage'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String(), usageId: t.String() }),
    body: t.Object({
      enabled: t.Optional(t.Boolean()),
      usageConfig: t.Optional(t.Record(t.String(), t.Any())),
    }),
    detail: { tags: ['App Tool Usage'], summary: 'Update tool usage' },
  })

  .put('/instance/:instanceId', async ({ params, body, set }) => {
    try {
      const result = await appToolUsageService.upsert(params.id, params.instanceId, {
        enabled: body.enabled,
        usageConfig: body.usageConfig,
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upsert tool usage'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String(), instanceId: t.String() }),
    body: t.Object({
      enabled: t.Optional(t.Boolean()),
      usageConfig: t.Optional(t.Record(t.String(), t.Any())),
    }),
    detail: { tags: ['App Tool Usage'], summary: 'Create or update tool usage for a specific instance' },
  })

  .delete('/:usageId', async ({ params, set }) => {
    try {
      const existing = await appToolUsageService.getById(params.usageId)
      if (existing && existing.appId !== params.id) {
        set.status = 404
        return { error: `App tool usage '${params.usageId}' not found for this app` }
      }

      await appToolUsageService.delete(params.usageId)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete tool usage'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String(), usageId: t.String() }),
    detail: { tags: ['App Tool Usage'], summary: 'Remove tool from app' },
  })

  .post('/:usageId/toggle', async ({ params, body, set }) => {
    try {
      const existing = await appToolUsageService.getById(params.usageId)
      if (existing && existing.appId !== params.id) {
        set.status = 404
        return { error: `App tool usage '${params.usageId}' not found for this app` }
      }

      const updated = await appToolUsageService.toggle(params.usageId, body.enabled)
      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to toggle tool'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String(), usageId: t.String() }),
    body: t.Object({
      enabled: t.Boolean(),
    }),
    detail: { tags: ['App Tool Usage'], summary: 'Toggle tool enabled/disabled' },
  })

  .post('/:usageId/test', async ({ params, set }) => {
    const existing = await appToolUsageService.getById(params.usageId)
    if (existing && existing.appId !== params.id) {
      set.status = 404
      return { error: `App tool usage '${params.usageId}' not found for this app` }
    }

    const result = await appToolUsageService.testQuery(params.usageId)

    if (!result.success && result.error?.includes('not found')) {
      set.status = 404
    }

    return result
  }, {
    params: t.Object({ id: t.String(), usageId: t.String() }),
    detail: { tags: ['App Tool Usage'], summary: 'Test tool query' },
  })

  .post('/:usageId/execute', async ({ params, body, set }) => {
    const existing = await appToolUsageService.getById(params.usageId)
    if (existing && existing.appId !== params.id) {
      set.status = 404
      return { error: `App tool usage '${params.usageId}' not found for this app` }
    }

    const result = await appToolUsageService.execute(params.usageId, body?.usageConfig)

    if (!result.success && result.error?.includes('not found')) {
      set.status = 404
    }

    return result
  }, {
    params: t.Object({ id: t.String(), usageId: t.String() }),
    body: t.Optional(t.Object({ usageConfig: t.Optional(t.Record(t.String(), t.Any())) })),
    detail: { tags: ['App Tool Usage'], summary: 'Execute tool' },
  })
