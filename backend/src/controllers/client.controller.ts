import { Elysia, t } from 'elysia'
import { getAllClients, getClient } from '../clients'

export const clientController = new Elysia({ prefix: '/api/v1/clients' })
  .get('/', async () => {
    return getAllClients()
  }, {
    detail: { tags: ['Clients'], summary: 'List all clients' },
  })

  .get('/vendors', async () => {
    const clients = await getAllClients()
    const availableClients = clients.filter((c) => c.available)
    const vendors = availableClients.map((c) => ({
      id: c.name,
      displayName: c.displayName,
    }))
    const modelsByVendor: Record<string, Array<{ id: string; displayName: string }>> = {}
    for (const client of availableClients) {
      modelsByVendor[client.name] = client.models.map((m) => ({
        id: m.id,
        displayName: m.name,
      }))
    }
    return { vendors, modelsByVendor }
  }, {
    detail: { tags: ['Clients'], summary: 'List vendors and models' },
  })

  .get('/:name', async ({ params, set }) => {
    try {
      const client = getClient(params.name as 'openai' | 'anthropic' | 'gemini')
      return {
        name: client.name,
        displayName: client.displayName,
        available: await client.isAvailable(),
        models: client.getModels(),
      }
    } catch {
      set.status = 404
      return { error: `Client not found: ${params.name}` }
    }
  }, {
    params: t.Object({ name: t.String() }),
    detail: { tags: ['Clients'], summary: 'Get client details' },
  })

  .get('/:name/models', ({ params, set }) => {
    try {
      const client = getClient(params.name as 'openai' | 'anthropic' | 'gemini')
      return client.getModels()
    } catch {
      set.status = 404
      return { error: `Client not found: ${params.name}` }
    }
  }, {
    params: t.Object({ name: t.String() }),
    detail: { tags: ['Clients'], summary: 'List client models' },
  })

  .get('/:name/status', async ({ params, set }) => {
    try {
      const client = getClient(params.name as 'openai' | 'anthropic' | 'gemini')
      return {
        name: client.name,
        available: await client.isAvailable(),
      }
    } catch {
      set.status = 404
      return { error: `Client not found: ${params.name}` }
    }
  }, {
    params: t.Object({ name: t.String() }),
    detail: { tags: ['Clients'], summary: 'Check client status' },
  })
