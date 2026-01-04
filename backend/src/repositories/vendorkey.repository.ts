import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { Vendor } from '../types'

export interface VendorKeyRecord {
  id: string
  vendor: Vendor
  encryptedKey: string
  createdAt: Date
  updatedAt: Date
}

export const vendorKeyRepository = {
  async findAll(): Promise<VendorKeyRecord[]> {
    const results = await db.select().from(schema.vendorApiKeys)
    return results.map((r) => ({
      id: r.id,
      vendor: r.provider as Vendor,
      encryptedKey: r.encryptedKey,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
  },

  async findByVendor(vendor: Vendor): Promise<VendorKeyRecord | null> {
    const [key] = await db
      .select()
      .from(schema.vendorApiKeys)
      .where(eq(schema.vendorApiKeys.provider, vendor))
      .limit(1)
    if (!key) return null
    return {
      id: key.id,
      vendor: key.provider as Vendor,
      encryptedKey: key.encryptedKey,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }
  },

  async upsert(data: { id: string; vendor: Vendor; encryptedKey: string }): Promise<VendorKeyRecord> {
    const now = new Date()
    const [result] = await db
      .insert(schema.vendorApiKeys)
      .values({
        id: data.id,
        provider: data.vendor,
        encryptedKey: data.encryptedKey,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.vendorApiKeys.provider,
        set: {
          encryptedKey: data.encryptedKey,
          updatedAt: now,
        },
      })
      .returning()
    return {
      id: result.id,
      vendor: result.provider as Vendor,
      encryptedKey: result.encryptedKey,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }
  },

  async delete(vendor: Vendor): Promise<boolean> {
    await db.delete(schema.vendorApiKeys).where(eq(schema.vendorApiKeys.provider, vendor))
    return true
  },
}
