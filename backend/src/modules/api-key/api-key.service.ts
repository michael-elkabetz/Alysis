import { nanoid } from 'nanoid'
import { apiKeyRepository } from './api-key.repository'
import { apiKeyCache } from './apikey.cache'

function generateApiKey(): string {
  return `aak_${nanoid(32)}`
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface CreateApiKeyResult {
  id: string
  name: string
  key: string
  analysisId: string | null
  createdAt: Date
}

export const apiKeyService = {
  async initialize(): Promise<void> {
    const allKeys = await apiKeyRepository.findAll()
    apiKeyCache.populate(allKeys)
  },

  async createForAnalysis(analysisId: string, name?: string): Promise<CreateApiKeyResult> {
    const key = generateApiKey()
    const keyHash = await hashApiKey(key)
    const id = `ak-${nanoid(10)}`
    const keyName = name || `API Key for ${analysisId}`

    const apiKey = await apiKeyRepository.create({ id, name: keyName, keyHash, analysisId })
    apiKeyCache.set(apiKey)

    return {
      id: apiKey.id,
      name: apiKey.name,
      key,
      analysisId: apiKey.analysisId,
      createdAt: apiKey.createdAt,
    }
  },

  async createGlobal(name: string): Promise<CreateApiKeyResult> {
    const key = generateApiKey()
    const keyHash = await hashApiKey(key)
    const id = `ak-${nanoid(10)}`

    const apiKey = await apiKeyRepository.create({ id, name, keyHash, analysisId: null })
    apiKeyCache.set(apiKey)

    return {
      id: apiKey.id,
      name: apiKey.name,
      key,
      analysisId: null,
      createdAt: apiKey.createdAt,
    }
  },

  async validate(key: string, analysisId?: string): Promise<{ valid: boolean; name?: string; isGlobal?: boolean }> {
    const keyHash = await hashApiKey(key)
    const apiKey = apiKeyCache.get(keyHash)

    if (!apiKey) {
      return { valid: false }
    }

    apiKeyRepository.updateLastUsed(apiKey.id).catch(() => {})

    if (!apiKey.analysisId) {
      return { valid: true, name: apiKey.name, isGlobal: true }
    }

    if (analysisId && apiKey.analysisId === analysisId) {
      return { valid: true, name: apiKey.name, isGlobal: false }
    }

    if (analysisId) {
      return { valid: false }
    }

    return { valid: true, name: apiKey.name, isGlobal: false }
  },

  async getForAnalysis(analysisId: string) {
    return apiKeyRepository.findByAnalysisId(analysisId)
  },

  async delete(keyId: string): Promise<boolean> {
    const existing = await apiKeyRepository.findById(keyId)
    if (existing) {
      apiKeyCache.delete(existing.keyHash)
    }
    return apiKeyRepository.delete(keyId)
  },

  async regenerate(keyId: string): Promise<CreateApiKeyResult | null> {
    const existing = await apiKeyRepository.findById(keyId)
    if (!existing) return null

    const oldKeyHash = existing.keyHash
    const newKey = generateApiKey()
    const newKeyHash = await hashApiKey(newKey)

    const updated = await apiKeyRepository.updateKeyHash(keyId, newKeyHash)
    if (!updated) return null

    apiKeyCache.updateHash(oldKeyHash, newKeyHash)

    return {
      id: updated.id,
      name: updated.name,
      key: newKey,
      analysisId: updated.analysisId,
      createdAt: updated.createdAt,
    }
  },

  deleteByAppId(appId: string): void {
    apiKeyCache.deleteByAppId(appId)
  },
}
