import type { ApiKeyRecord } from './api-key.repository'

const hashCache = new Map<string, ApiKeyRecord>()
const appIndex = new Map<string, Set<string>>()

function addToAppIndex(record: ApiKeyRecord): void {
  if (!record.analysisId) return
  
  const existing = appIndex.get(record.analysisId)
  if (existing) {
    existing.add(record.keyHash)
  } else {
    appIndex.set(record.analysisId, new Set([record.keyHash]))
  }
}

function removeFromAppIndex(record: ApiKeyRecord): void {
  if (!record.analysisId) return
  
  const existing = appIndex.get(record.analysisId)
  if (existing) {
    existing.delete(record.keyHash)
    if (existing.size === 0) {
      appIndex.delete(record.analysisId)
    }
  }
}

export const apiKeyCache = {
  populate(records: ApiKeyRecord[]): void {
    hashCache.clear()
    appIndex.clear()
    
    for (const record of records) {
      hashCache.set(record.keyHash, record)
      addToAppIndex(record)
    }
  },

  get(keyHash: string): ApiKeyRecord | null {
    return hashCache.get(keyHash) || null
  },

  set(record: ApiKeyRecord): void {
    hashCache.set(record.keyHash, record)
    addToAppIndex(record)
  },

  delete(keyHash: string): void {
    const record = hashCache.get(keyHash)
    if (record) {
      removeFromAppIndex(record)
      hashCache.delete(keyHash)
    }
  },

  updateHash(oldHash: string, newHash: string): void {
    const record = hashCache.get(oldHash)
    if (!record) return

    removeFromAppIndex(record)
    hashCache.delete(oldHash)

    const updated = { ...record, keyHash: newHash }
    hashCache.set(newHash, updated)
    addToAppIndex(updated)
  },

  deleteByAppId(appId: string): void {
    const hashes = appIndex.get(appId)
    if (!hashes) return

    for (const hash of hashes) {
      hashCache.delete(hash)
    }
    appIndex.delete(appId)
  },

  size(): number {
    return hashCache.size
  },
}
