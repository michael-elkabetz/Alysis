import { Elysia, t } from 'elysia'
import { vendorKeyService } from '../services'

export const vendorKeyController = new Elysia({ prefix: '/api/v1/vendor-keys' })
  .get('/', async () => {
    return vendorKeyService.getStatuses()
  }, {
    detail: { tags: ['Vendor Keys'], summary: 'List vendor API key statuses' },
  })

  .put('/:vendor', async ({ params, body, set }) => {
    const vendor = params.vendor as 'openai' | 'anthropic' | 'gemini'

    if (!['openai', 'anthropic', 'gemini'].includes(vendor)) {
      set.status = 400
      return { error: `Invalid vendor: ${vendor}` }
    }

    try {
      const result = await vendorKeyService.upsert(vendor, body.apiKey)
      return result
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to save API key' }
    }
  }, {
    params: t.Object({ vendor: t.String() }),
    body: t.Object({ apiKey: t.String({ minLength: 1 }) }),
    detail: { tags: ['Vendor Keys'], summary: 'Set vendor API key' },
  })

  .delete('/:vendor', async ({ params, set }) => {
    const vendor = params.vendor as 'openai' | 'anthropic' | 'gemini'

    if (!['openai', 'anthropic', 'gemini'].includes(vendor)) {
      set.status = 400
      return { error: `Invalid vendor: ${vendor}` }
    }

    await vendorKeyService.delete(vendor)
    return { success: true }
  }, {
    params: t.Object({ vendor: t.String() }),
    detail: { tags: ['Vendor Keys'], summary: 'Delete vendor API key' },
  })
