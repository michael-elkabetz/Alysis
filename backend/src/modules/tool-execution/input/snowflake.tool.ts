import type { SnowflakeConfig } from '../../../shared/types'
import * as crypto from 'crypto'

export interface SnowflakeQueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
}

let snowflake: typeof import('snowflake-sdk') | null = null

async function getSnowflakeSDK() {
  if (!snowflake) {
    snowflake = await import('snowflake-sdk')
  }
  return snowflake
}

function decryptPrivateKey(encryptedKey: string, passphrase?: string): string {
  const normalized = encryptedKey.replace(/\\n/g, '\n').trim()

  if (!normalized.includes('ENCRYPTED')) {
    return normalized
  }

  if (!passphrase) {
    throw new Error('Private key is encrypted but no passphrase provided')
  }

  const privateKeyObject = crypto.createPrivateKey({
    key: normalized,
    format: 'pem',
    passphrase: passphrase,
  })

  return privateKeyObject.export({
    type: 'pkcs8',
    format: 'pem',
  }) as string
}

export const snowflakeTool = {
  connection: null as ReturnType<typeof import('snowflake-sdk').createConnection> | null,

  async connect(config: SnowflakeConfig): Promise<void> {
    const sdk = await getSnowflakeSDK()

    return new Promise((resolve, reject) => {
      const connectionOptions: Record<string, unknown> = {
        account: config.account,
        username: config.user,
        warehouse: config.warehouse,
        database: config.database,
        schema: config.schema,
        role: config.role,
      }

      if (config.privateKey) {
        connectionOptions.authenticator = 'SNOWFLAKE_JWT'
        connectionOptions.privateKey = decryptPrivateKey(config.privateKey, config.privateKeyPassword)
      } else if (config.password) {
        connectionOptions.password = config.password
      }

      this.connection = sdk.createConnection(connectionOptions as unknown as Parameters<typeof sdk.createConnection>[0])

      this.connection.connect((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  },

  async executeQuery(query: string): Promise<SnowflakeQueryResult> {
    if (!this.connection) {
      throw new Error('Snowflake not connected')
    }

    return new Promise((resolve, reject) => {
      this.connection!.execute({
        sqlText: query,
        complete: (err, stmt, rows) => {
          void stmt
          if (err) {
            reject(err)
          } else {
            resolve({
              rows: (rows || []) as Record<string, unknown>[],
              rowCount: rows?.length || 0,
            })
          }
        },
      })
    })
  },

  async testConnection(config: SnowflakeConfig): Promise<{ success: boolean; error?: string }> {
    try {
      await this.connect(config)
      await this.executeQuery('SELECT 1')
      this.disconnect()
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  async testQuery(
    config: SnowflakeConfig,
    query: string,
  ): Promise<{ success: boolean; rowCount?: number; data?: unknown; error?: string }> {
    try {
      await this.connect(config)
      const result = await this.executeQuery(query)
      this.disconnect()
      return { success: true, rowCount: result.rowCount, data: result.rows }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },

  disconnect(): void {
    if (this.connection) {
      this.connection.destroy(() => {})
      this.connection = null
    }
  },
}
