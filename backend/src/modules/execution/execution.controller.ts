import { Elysia, t } from 'elysia'
import { executionService } from './execution.service'
import { DEFAULTS } from '../../shared/constants'

export const executionController = new Elysia({ prefix: '/api/v1' })
  .post('/analyze/:analysisId', async ({ params, body, request, set }) => {
    const apiKey = request.headers.get('x-api-key')
    const callerService = request.headers.get('x-caller-service') || undefined

    const result = await executionService.executeWithAuth(
      params.analysisId,
      body,
      apiKey,
      callerService
    )

    if (!result.success) {
      set.status = result.statusCode
      return { error: result.error }
    }

    return {
      id: result.log.id,
      output: result.log.output,
      status: result.log.status,
      latencyMs: result.log.latencyMs,
      tokenUsage: result.log.tokenUsage,
      errorMessage: result.log.errorMessage,
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
    const limit = query.limit ? parseInt(query.limit) : DEFAULTS.QUERY_LIMIT
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
