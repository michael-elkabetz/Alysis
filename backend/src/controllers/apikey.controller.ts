import { Elysia, t } from 'elysia'
import { apiKeyService } from '../services'

export const apiKeyController = new Elysia({ prefix: '/api/v1' })
  .get('/analyses/:id/api-keys', async ({ params }) => {
    return apiKeyService.getForAnalysis(params.id)
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['API Keys'], summary: 'List API keys for analysis' },
  })

  .post('/analyses/:id/api-keys', async ({ params, body, set }) => {
    try {
      const result = await apiKeyService.createForAnalysis(params.id, body.name)
      set.status = 201
      return {
        id: result.id,
        name: result.name,
        key: result.key,
        createdAt: result.createdAt,
      }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to create API key' }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ name: t.Optional(t.String()) }),
    detail: { tags: ['API Keys'], summary: 'Create API key for analysis' },
  })

  .delete('/api-keys/:keyId', async ({ params, set }) => {
    try {
      await apiKeyService.delete(params.keyId)
      return { success: true }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to delete API key' }
    }
  }, {
    params: t.Object({ keyId: t.String() }),
    detail: { tags: ['API Keys'], summary: 'Delete API key' },
  })

  .post('/api-keys/:keyId/regenerate', async ({ params, set }) => {
    try {
      const result = await apiKeyService.regenerate(params.keyId)
      if (!result) {
        set.status = 404
        return { error: 'API key not found' }
      }
      return {
        id: result.id,
        name: result.name,
        key: result.key,
        createdAt: result.createdAt,
      }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to regenerate API key' }
    }
  }, {
    params: t.Object({ keyId: t.String() }),
    detail: { tags: ['API Keys'], summary: 'Regenerate API key' },
  })

  .post('/api-keys', async ({ body, set }) => {
    try {
      const result = await apiKeyService.createGlobal(body.name)
      set.status = 201
      return {
        id: result.id,
        name: result.name,
        key: result.key,
        createdAt: result.createdAt,
      }
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to create API key' }
    }
  }, {
    body: t.Object({ name: t.String({ minLength: 1 }) }),
    detail: { tags: ['API Keys'], summary: 'Create global API key' },
  })
