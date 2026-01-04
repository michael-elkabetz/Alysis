import type { AIClient } from './base'
import { OpenAIClient } from './openai.client'
import { AnthropicClient } from './anthropic.client'
import { GeminiClient } from './gemini.client'
import type { Vendor, ClientInfo } from '../types'

const clients: Record<Vendor, AIClient> = {
  openai: new OpenAIClient(),
  anthropic: new AnthropicClient(),
  gemini: new GeminiClient(),
}

export function getClient(name: Vendor): AIClient {
  const client = clients[name]
  if (!client) {
    throw new Error(`Unknown vendor: ${name}`)
  }
  return client
}

export function inferVendor(model?: string): Vendor {
  if (!model) return 'openai'
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gemini')) return 'gemini'
  return 'openai'
}

export async function getAllClients(): Promise<ClientInfo[]> {
  const results = await Promise.all(
    Object.values(clients).map(async (client) => ({
      name: client.name as Vendor,
      displayName: client.displayName,
      available: await client.isAvailable(),
      models: client.getModels(),
    }))
  )
  return results
}

export async function getAvailableClients(): Promise<ClientInfo[]> {
  const all = await getAllClients()
  return all.filter((c) => c.available)
}

export { clients }
export { ClientError } from './base'
export type { AIClient, AIClientConfig } from './base'
