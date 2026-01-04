import { Elysia, t } from 'elysia'
import { analysisService, executionService } from '../services'

const VendorEnum = t.Union([t.Literal('openai'), t.Literal('anthropic'), t.Literal('gemini')])
const ResponseFormatEnum = t.Union([t.Literal('json'), t.Literal('text')])

export const analysisController = new Elysia({ prefix: '/api/v1/analyses' })
  .post('/', async ({ body, set }) => {
    try {
      const result = await analysisService.create(body)
      set.status = 201
      return {
        ...result.analysis,
        apiKey: {
          id: result.apiKey.id,
          name: result.apiKey.name,
          key: result.apiKey.key,
        },
      }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to create app' }
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      systemPrompt: t.String({ minLength: 1 }),
      vendor: t.Optional(VendorEnum),
      model: t.Optional(t.String()),
      temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      maxTokens: t.Optional(t.Number({ minimum: 1, maximum: 128000 })),
      responseFormat: t.Optional(ResponseFormatEnum),
    }),
    detail: { tags: ['Apps'], summary: 'Create app' },
  })

  .get('/', async ({ query }) => {
    return analysisService.getAll(query.search)
  }, {
    query: t.Object({ search: t.Optional(t.String()) }),
    detail: { tags: ['Apps'], summary: 'List apps' },
  })

  .get('/active', async () => {
    return analysisService.getActive()
  }, {
    detail: { tags: ['Apps'], summary: 'List active apps' },
  })

  .get('/:id', async ({ params, set }) => {
    const analysis = await analysisService.getById(params.id)
    if (!analysis) {
      set.status = 404
      return { error: 'App not found' }
    }
    return analysis
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Get app' },
  })

  .put('/:id', async ({ params, body, set }) => {
    try {
      const analysis = await analysisService.update(params.id, body)
      if (!analysis) {
        set.status = 404
        return { error: 'App not found' }
      }
      return analysis
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to update app' }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1 })),
      description: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Update app' },
  })

  .delete('/:id', async ({ params, set }) => {
    try {
      const deleted = await analysisService.delete(params.id)
      if (!deleted) {
        set.status = 404
        return { error: 'App not found' }
      }
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to delete app' }
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Delete app' },
  })

  .post('/:id/activate', async ({ params, set }) => {
    try {
      const analysis = await analysisService.activate(params.id)
      if (!analysis) {
        set.status = 404
        return { error: 'App not found' }
      }
      return analysis
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to activate app' }
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Activate app' },
  })

  .post('/:id/deprecate', async ({ params, set }) => {
    const analysis = await analysisService.deprecate(params.id)
    if (!analysis) {
      set.status = 404
      return { error: 'App not found' }
    }
    return analysis
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Deprecate app' },
  })

  .get('/:id/stats', async ({ params }) => {
    return executionService.getStats(params.id)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Get app statistics' },
  })

  .get('/:id/logs', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    const offset = query.offset ? parseInt(query.offset) : 0
    return executionService.getLogs(params.id, limit, offset)
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Get app logs' },
  })

  .post('/test-prompt', async ({ body, set }) => {
    try {
      const result = await executionService.testDirect(body, body.analysisId)
      if (result.error) {
        set.status = 400
        return { error: result.error, ...result }
      }
      return result
    } catch (error) {
      set.status = 500
      return { error: error instanceof Error ? error.message : 'Failed to test prompt' }
    }
  }, {
    body: t.Object({
      systemPrompt: t.String({ minLength: 1 }),
      input: t.Record(t.String(), t.Unknown()),
      vendor: t.Optional(VendorEnum),
      model: t.Optional(t.String()),
      temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      maxTokens: t.Optional(t.Number({ minimum: 1, maximum: 128000 })),
      responseFormat: t.Optional(ResponseFormatEnum),
      analysisId: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Test prompt' },
  })
