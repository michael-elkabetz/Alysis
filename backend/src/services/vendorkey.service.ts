import { nanoid } from 'nanoid'
import { vendorKeyRepository } from '../repositories'
import type { Vendor, VendorKeyStatus } from '../types'

function encodeKey(key: string): string {
  return Buffer.from(key).toString('base64')
}

function decodeKey(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8')
}

function maskKey(key: string): string {
  if (key.length <= 4) return '****'
  return '****' + key.slice(-4)
}

function getEnvKeyForVendor(vendor: Vendor): string | null {
  switch (vendor) {
    case 'openai':
      return process.env.OPENAI_API_KEY || null
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || null
    case 'gemini':
      return process.env.GEMINI_API_KEY || null
    default:
      return null
  }
}

export const vendorKeyService = {
  async getStatuses(): Promise<VendorKeyStatus[]> {
    const vendors: Vendor[] = ['openai', 'anthropic', 'gemini']
    const dbKeys = await vendorKeyRepository.findAll()

    return vendors.map((vendor) => {
      const dbKey = dbKeys.find((k) => k.vendor === vendor)
      const envKey = getEnvKeyForVendor(vendor)

      if (dbKey) {
        const decoded = decodeKey(dbKey.encryptedKey)
        return {
          vendor,
          configured: true,
          source: 'database' as const,
          maskedKey: maskKey(decoded),
          updatedAt: dbKey.updatedAt,
        }
      } else if (envKey) {
        return {
          vendor,
          configured: true,
          source: 'environment' as const,
          maskedKey: maskKey(envKey),
          updatedAt: null,
        }
      }

      return {
        vendor,
        configured: false,
        source: null,
        maskedKey: null,
        updatedAt: null,
      }
    })
  },

  async upsert(vendor: Vendor, apiKey: string): Promise<VendorKeyStatus> {
    const id = `vk-${nanoid(10)}`
    const encryptedKey = encodeKey(apiKey)

    const result = await vendorKeyRepository.upsert({ id, vendor, encryptedKey })

    return {
      vendor,
      configured: true,
      source: 'database',
      maskedKey: maskKey(apiKey),
      updatedAt: result.updatedAt,
    }
  },

  async delete(vendor: Vendor): Promise<boolean> {
    return vendorKeyRepository.delete(vendor)
  },

  async getKeyForVendor(vendor: Vendor): Promise<string | null> {
    const dbKey = await vendorKeyRepository.findByVendor(vendor)
    if (dbKey) {
      return decodeKey(dbKey.encryptedKey)
    }
    return getEnvKeyForVendor(vendor)
  },
}
