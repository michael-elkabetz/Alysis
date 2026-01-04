import { Elysia, t } from 'elysia'
import { executionService, apiKeyService } from '../services'

export const executionController = new Elysia({ prefix: '/api/v1' })
  .post('/analyze/:analysisId', async ({ params, body, request, set }) => {
    const apiKey = request.headers.get('x-api-key')
    const callerService = request.headers.get('x-caller-service') || undefined

    if (!apiKey) {
      await executionService.logFailure(
        params.analysisId,
        'Missing API key. Include X-API-Key header.',
        body.input || {},
        0,
        'auth_error',
        callerService
      )
      set.status = 401
      return { error: 'Missing API key. Include X-API-Key header.' }
    }

    const validation = await apiKeyService.validate(apiKey, params.analysisId)
    if (!validation.valid) {
      await executionService.logFailure(
        params.analysisId,
        'Invalid API key or key does not have access to this app.',
        body.input || {},
        0,
        'auth_error',
        callerService
      )
      set.status = 403
      return { error: 'Invalid API key or key does not have access to this app.' }
    }

    try {
      const log = await executionService.execute(params.analysisId, body, callerService)
      return {
        id: log.id,
        output: log.output,
        status: log.status,
        latencyMs: log.latencyMs,
        tokenUsage: log.tokenUsage,
        errorMessage: log.errorMessage,
      }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to execute app' }
    }
  }, {
    params: t.Object({ analysisId: t.String() }),
    body: t.Object({ input: t.Record(t.String(), t.Unknown()) }),
    detail: { tags: ['Execution'], summary: 'Execute app' },
  })

  .get('/logs/:executionId', async ({ params, set }) => {
    const log = await executionService.getLogById(params.executionId)
    if (!log) {
      set.status = 404
      return { error: 'Execution log not found' }
    }
    return log
  }, {
    params: t.Object({ executionId: t.String() }),
    detail: { tags: ['Execution'], summary: 'Get execution log' },
  })

  .get('/logs', async ({ query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    return executionService.getRecentLogs(limit)
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
    detail: { tags: ['Execution'], summary: 'Get recent logs' },
  })

  .get('/stats', async () => {
    return executionService.getGlobalStats()
  }, {
    detail: { tags: ['Execution'], summary: 'Get global statistics' },
  })
