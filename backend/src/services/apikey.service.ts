import { nanoid } from 'nanoid'
import { apiKeyRepository } from '../repositories'

function generateApiKey(): string {
  return `aak_${nanoid(32)}`
}

function hashApiKey(key: string): string {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  let hash = 5381
  for (const byte of data) {
    hash = ((hash << 5) + hash) ^ byte
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

export interface CreateApiKeyResult {
  id: string
  name: string
  key: string
  analysisId: string | null
  createdAt: Date
}

export const apiKeyService = {
  async createForAnalysis(analysisId: string, name?: string): Promise<CreateApiKeyResult> {
    const key = generateApiKey()
    const keyHash = hashApiKey(key)
    const id = `ak-${nanoid(10)}`
    const keyName = name || `API Key for ${analysisId}`

    const apiKey = await apiKeyRepository.create({ id, name: keyName, keyHash, analysisId })

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
    const keyHash = hashApiKey(key)
    const id = `ak-${nanoid(10)}`

    const apiKey = await apiKeyRepository.create({ id, name, keyHash, analysisId: null })

    return {
      id: apiKey.id,
      name: apiKey.name,
      key,
      analysisId: null,
      createdAt: apiKey.createdAt,
    }
  },

  async validate(key: string, analysisId?: string): Promise<{ valid: boolean; name?: string; isGlobal?: boolean }> {
    const keyHash = hashApiKey(key)
    const apiKey = await apiKeyRepository.findByHash(keyHash)

    if (!apiKey) {
      return { valid: false }
    }

    await apiKeyRepository.updateLastUsed(apiKey.id)

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
    return apiKeyRepository.delete(keyId)
  },

  async regenerate(keyId: string): Promise<CreateApiKeyResult | null> {
    const existing = await apiKeyRepository.findById(keyId)
    if (!existing) return null

    const newKey = generateApiKey()
    const newKeyHash = hashApiKey(newKey)

    const updated = await apiKeyRepository.updateKeyHash(keyId, newKeyHash)
    if (!updated) return null

    return {
      id: updated.id,
      name: updated.name,
      key: newKey,
      analysisId: updated.analysisId,
      createdAt: updated.createdAt,
    }
  },
}
