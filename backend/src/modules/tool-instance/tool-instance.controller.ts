import { Elysia, t } from 'elysia'
import { toolInstanceService } from './tool-instance.service'

export const toolInstanceController = new Elysia({ prefix: '/api/v1/tool-instances' })
  .get('/', async () => {
    return toolInstanceService.getAll()
  }, {
    detail: { tags: ['Tool Instances'], summary: 'List all tool instances' },
  })

  .get('/statuses', async () => {
    return toolInstanceService.getAllStatuses()
  }, {
    detail: { tags: ['Tool Instances'], summary: 'Get all tool instance statuses' },
  })

  .get('/:id', async ({ params, set }) => {
    const instance = await toolInstanceService.getById(params.id)

    if (!instance) {
      set.status = 404
      return { error: `Tool instance '${params.id}' not found` }
    }

    return instance
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Tool Instances'], summary: 'Get tool instance by ID' },
  })

  .get('/by-definition/:definitionId', async ({ params }) => {
    return toolInstanceService.getByDefinitionId(params.definitionId)
  }, {
    params: t.Object({ definitionId: t.String() }),
    detail: { tags: ['Tool Instances'], summary: 'Get tool instances by definition ID' },
  })

  .post('/', async ({ body, set }) => {
    try {
      const created = await toolInstanceService.create({
        toolDefinitionId: body.toolDefinitionId,
        name: body.name,
        config: body.config,
      })

      set.status = 201
      return created
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create tool instance'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    body: t.Object({
      toolDefinitionId: t.String({ minLength: 1 }),
      name: t.String({ minLength: 1 }),
      config: t.Record(t.String(), t.Any()),
    }),
    detail: { tags: ['Tool Instances'], summary: 'Create a new tool instance' },
  })

  .put('/:id', async ({ params, body, set }) => {
    try {
      const updated = await toolInstanceService.update(params.id, {
        name: body.name,
        config: body.config,
      })

      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tool instance'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      config: t.Optional(t.Record(t.String(), t.Any())),
    }),
    detail: { tags: ['Tool Instances'], summary: 'Update a tool instance' },
  })

  .delete('/:id', async ({ params, set }) => {
    try {
      await toolInstanceService.delete(params.id)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete tool instance'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Tool Instances'], summary: 'Delete a tool instance' },
  })

  .post('/:id/test', async ({ params, set }) => {
    const result = await toolInstanceService.testConnection(params.id)

    if (!result.success && result.error?.includes('not found')) {
      set.status = 404
    }

    return result
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Tool Instances'], summary: 'Test tool instance connection' },
  })

  .post('/:id/test-query', async ({ params, body, set }) => {
    const result = await toolInstanceService.testQuery(params.id, body.usageConfig)

    if (!result.success && result.error?.includes('not found')) {
      set.status = 404
    }

    return result
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      usageConfig: t.Record(t.String(), t.Any()),
    }),
    detail: { tags: ['Tool Instances'], summary: 'Test a query with the tool instance' },
  })

  .post('/:id/execute', async ({ params, body, set }) => {
    const result = await toolInstanceService.execute(params.id, body.usageConfig)

    if (!result.success && result.error?.includes('not found')) {
      set.status = 404
    }

    return result
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      usageConfig: t.Record(t.String(), t.Any()),
    }),
    detail: { tags: ['Tool Instances'], summary: 'Execute the tool instance' },
  })
