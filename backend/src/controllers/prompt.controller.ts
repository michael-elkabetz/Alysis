import { Elysia, t } from 'elysia'
import { promptService, executionService } from '../services'

const VendorEnum = t.Union([t.Literal('openai'), t.Literal('anthropic'), t.Literal('gemini')])
const ResponseFormatEnum = t.Union([t.Literal('json'), t.Literal('text')])

export const promptController = new Elysia({ prefix: '/api/v1/analyses/:id/prompts' })
  .post('/', async ({ params, body, set }) => {
    try {
      const version = await promptService.create(params.id, body)
      set.status = 201
      return version
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to create prompt version' }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      systemPrompt: t.String({ minLength: 1 }),
      vendor: t.Optional(VendorEnum),
      model: t.Optional(t.String()),
      temperature: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      maxTokens: t.Optional(t.Number({ minimum: 1, maximum: 128000 })),
      responseFormat: t.Optional(ResponseFormatEnum),
    }),
    detail: { tags: ['Prompts'], summary: 'Create prompt version' },
  })

  .get('/', async ({ params }) => {
    return promptService.getAll(params.id)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Prompts'], summary: 'List prompt versions' },
  })

  .get('/latest', async ({ params, set }) => {
    const version = await promptService.getLatest(params.id)
    if (!version) {
      set.status = 404
      return { error: 'No prompt versions found' }
    }
    return version
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Prompts'], summary: 'Get latest prompt version' },
  })

  .get('/active', async ({ params, set }) => {
    const version = await promptService.getActive(params.id)
    if (!version) {
      set.status = 404
      return { error: 'No active prompt version found' }
    }
    return version
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Prompts'], summary: 'Get active prompt version' },
  })

  .get('/:promptId', async ({ params, set }) => {
    const version = await promptService.getById(params.id, params.promptId)
    if (!version) {
      set.status = 404
      return { error: 'Prompt version not found' }
    }
    return version
  }, {
    params: t.Object({ id: t.String(), promptId: t.String() }),
    detail: { tags: ['Prompts'], summary: 'Get prompt version' },
  })

  .delete('/:promptId', async ({ params, set }) => {
    const result = await promptService.delete(params.id, params.promptId)
    if (!result.success) {
      set.status = 400
      return { error: result.error }
    }
    return { success: true }
  }, {
    params: t.Object({ id: t.String(), promptId: t.String() }),
    detail: { tags: ['Prompts'], summary: 'Delete prompt version' },
  })

  .get('/by-number/:version', async ({ params, set }) => {
    const versionNumber = parseInt(params.version)
    if (isNaN(versionNumber)) {
      set.status = 400
      return { error: 'Invalid version number' }
    }
    const version = await promptService.getByVersionNumber(params.id, versionNumber)
    if (!version) {
      set.status = 404
      return { error: 'Prompt version not found' }
    }
    return version
  }, {
    params: t.Object({ id: t.String(), version: t.String() }),
    detail: { tags: ['Prompts'], summary: 'Get prompt version by number' },
  })

  .post('/:promptId/publish', async ({ params, set }) => {
    try {
      const version = await promptService.publish(params.id, params.promptId)
      if (!version) {
        set.status = 404
        return { error: 'Prompt version not found' }
      }
      return version
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to publish prompt version' }
    }
  }, {
    params: t.Object({ id: t.String(), promptId: t.String() }),
    detail: { tags: ['Prompts'], summary: 'Publish prompt version' },
  })

  .post('/:promptId/test', async ({ params, body, request, set }) => {
    const callerService = request.headers.get('x-caller-service') || undefined
    try {
      const log = await executionService.testVersion(params.id, params.promptId, body.input, callerService)
      return log
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to test prompt' }
    }
  }, {
    params: t.Object({ id: t.String(), promptId: t.String() }),
    body: t.Object({ input: t.Record(t.String(), t.Unknown()) }),
    detail: { tags: ['Prompts'], summary: 'Test prompt version' },
  })
