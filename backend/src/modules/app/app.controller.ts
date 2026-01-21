import { Elysia, t } from 'elysia'
import { appService } from './app.service'
import { executionService } from '../execution/execution.service'
import { toolConfigService } from '../tool-config/tool-config.service'
import { DEFAULTS, LIMITS } from '../../shared/constants'
import { handleControllerError } from '../../utils/http'

const VendorEnum = t.Union([t.Literal('openai'), t.Literal('anthropic'), t.Literal('gemini')])
const ResponseFormatEnum = t.Union([t.Literal('json'), t.Literal('text')])
const InterfacesSchema = t.Optional(t.Object({
  output: t.Object({
    type: t.Literal('object'),
    properties: t.Record(t.String(), t.Object({
      type: t.String(),
      description: t.Optional(t.String()),
    })),
    required: t.Optional(t.Array(t.String())),
  }),
}))

export const appController = new Elysia({ prefix: '/api/v1/apps' })
  .post('/', async ({ body, set }) => {
    try {
      const result = await appService.create(body)
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
      return handleControllerError(error, set, 'Failed to create app')
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: LIMITS.NAME_MIN_LENGTH }),
      description: t.Optional(t.String()),
      systemPrompt: t.String({ minLength: LIMITS.NAME_MIN_LENGTH }),
      interfaces: InterfacesSchema,
      vendor: t.Optional(VendorEnum),
      model: t.Optional(t.String()),
      temperature: t.Optional(t.Number({ minimum: LIMITS.TEMPERATURE_MIN, maximum: LIMITS.TEMPERATURE_MAX })),
      maxTokens: t.Optional(t.Number({ minimum: 1, maximum: LIMITS.MAX_TOKENS_CEILING })),
      responseFormat: t.Optional(ResponseFormatEnum),
      sampleData: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Create app' },
  })

  .post('/magic', async ({ body, set }) => {
    try {
      return await appService.magic(body.description, body.vendor, body.model)
    } catch (error) {
      return handleControllerError(error, set, 'Failed to generate app config')
    }
  }, {
    body: t.Object({
      description: t.String({ minLength: 5 }),
      vendor: t.Optional(VendorEnum),
      model: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Generate app configuration using AI' },
  })

  .get('/', async ({ query }) => {
    return appService.getAll(query.search)
  }, {
    query: t.Object({ search: t.Optional(t.String()) }),
    detail: { tags: ['Apps'], summary: 'List apps' },
  })

  .get('/active', async () => {
    return appService.getActive()
  }, {
    detail: { tags: ['Apps'], summary: 'List active apps' },
  })

  .get('/:id', async ({ params, set }) => {
    const app = await appService.getById(params.id)
    if (!app) {
      set.status = 404
      return { error: 'App not found' }
    }
    return app
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Get app' },
  })

  .put('/:id', async ({ params, body, set }) => {
    try {
      const app = await appService.update(params.id, body)
      if (!app) {
        set.status = 404
        return { error: 'App not found' }
      }
      return app
    } catch (error) {
      return handleControllerError(error, set, 'Failed to update app')
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: LIMITS.NAME_MIN_LENGTH })),
      description: t.Optional(t.String()),
      sampleData: t.Optional(t.String()),
      toolUsage: t.Optional(t.Object({
        snowflake: t.Optional(t.Object({
          enabled: t.Boolean(),
          query: t.String(),
        })),
      })),
    }),
    detail: { tags: ['Apps'], summary: 'Update app' },
  })

  .delete('/:id', async ({ params, set }) => {
    try {
      const deleted = await appService.delete(params.id)
      if (!deleted) {
        set.status = 404
        return { error: 'App not found' }
      }
      return { success: true }
    } catch (error) {
      return handleControllerError(error, set, 'Failed to delete app')
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Delete app' },
  })

  .post('/:id/activate', async ({ params, set }) => {
    try {
      const app = await appService.activate(params.id)
      if (!app) {
        set.status = 404
        return { error: 'App not found' }
      }
      return app
    } catch (error) {
      return handleControllerError(error, set, 'Failed to activate app')
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Activate app' },
  })

  .post('/:id/deprecate', async ({ params, set }) => {
    const app = await appService.deprecate(params.id)
    if (!app) {
      set.status = 404
      return { error: 'App not found' }
    }
    return app
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Deprecate app' },
  })

  .get('/:id/stats', async ({ params, query }) => {
    return executionService.getStats(params.id, query.versionId)
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({ versionId: t.Optional(t.String()) }),
    detail: { tags: ['Apps'], summary: 'Get app statistics (optionally filter by version)' },
  })

  .get('/:id/logs', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : DEFAULTS.QUERY_LIMIT
    const offset = query.offset ? parseInt(query.offset) : DEFAULTS.QUERY_OFFSET
    return executionService.getLogs(params.id, limit, offset)
  }, {
    params: t.Object({ id: t.String() }),
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Get app logs' },
  })

  .get('/:id/cost-stats', async ({ params }) => {
    return executionService.getCostStatsByVersion(params.id)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Apps'], summary: 'Get cost statistics by version' },
  })

  .post('/test-prompt', async ({ body, set }) => {
    try {
      const result = await executionService.testDirect(body, body.appId, body.versionId)
      if (result.error) {
        set.status = 400
        return { error: result.error, ...result }
      }
      return result
    } catch (error) {
      return handleControllerError(error, set, 'Failed to test prompt')
    }
  }, {
    body: t.Object({
      systemPrompt: t.String({ minLength: LIMITS.NAME_MIN_LENGTH }),
      input: t.Record(t.String(), t.Unknown()),
      vendor: t.Optional(VendorEnum),
      model: t.Optional(t.String()),
      temperature: t.Optional(t.Number({ minimum: LIMITS.TEMPERATURE_MIN, maximum: LIMITS.TEMPERATURE_MAX })),
      maxTokens: t.Optional(t.Number({ minimum: 1, maximum: LIMITS.MAX_TOKENS_CEILING })),
      responseFormat: t.Optional(ResponseFormatEnum),
      appId: t.Optional(t.String()),
      versionId: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Test prompt' },
  })

  .post('/:id/test-tool', async ({ params, body, set }) => {
    try {
      const app = await appService.getById(params.id)
      if (!app) {
        set.status = 404
        return { error: 'App not found' }
      }

      const query = body.query || app.toolUsage?.snowflake?.query
      if (!query) {
        set.status = 400
        return { error: 'No query provided and app has no configured query' }
      }

      const result = await toolConfigService.testQuery('snowflake', query)
      return result
    } catch (error) {
      return handleControllerError(error, set, 'Failed to test tool query')
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      query: t.Optional(t.String()),
    }),
    detail: { tags: ['Apps'], summary: 'Test tool query for app' },
  })
