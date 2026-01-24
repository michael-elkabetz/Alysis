import type { ToolExecutor, TestConnectionResult, ExecuteResult, TestQueryResult } from '../executor.interface'
import type { HttpConfig } from '../../../db/schema'

export class HttpExecutor implements ToolExecutor {
  private normalizeUrl(url: string): string {
    if (!url) return url
    const trimmed = url.trim()
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed
    }
    return `https://${trimmed}`
  }

  private buildHeaders(config: HttpConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config.authType && config.authToken && config.authType !== 'none') {
      const headerName = config.authHeaderName || 'Authorization'
      const type = config.authType

      if (type === 'bearer') {
        headers[headerName] = `Bearer ${config.authToken}`
      } else if (type === 'basic') {
        headers[headerName] = `Basic ${config.authToken}`
      } else if (type === 'api_key') {
        headers[headerName] = config.authToken
      }
    }

    return headers
  }

  async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    const httpConfig = config as unknown as HttpConfig

    if (!httpConfig.url || !httpConfig.method) {
      return {
        success: false,
        error: 'No URL configured',
      }
    }

    try {
      const headers = this.buildHeaders(httpConfig)
      const normalizedUrl = this.normalizeUrl(httpConfig.url)

      await fetch(normalizedUrl, {
        method: 'HEAD',
        headers,
      })

      return {
        success: true,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to URL',
      }
    }
  }

  async execute(
    config: Record<string, unknown>,
    _usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult> {
    const httpConfig = config as unknown as HttpConfig

    if (!httpConfig.url || !httpConfig.method) {
      return {
        success: false,
        error: 'No URL configured',
      }
    }

    const startTime = Date.now()

    try {
      const headers = this.buildHeaders(httpConfig)
      const normalizedUrl = this.normalizeUrl(httpConfig.url)

      const fetchOptions: RequestInit = {
        method: httpConfig.method || 'GET',
        headers,
      }

      if (['POST', 'PUT', 'PATCH'].includes(httpConfig.method) && httpConfig.body) {
        fetchOptions.body = httpConfig.body
      }

      const response = await fetch(normalizedUrl, fetchOptions)
      const latencyMs = Date.now() - startTime

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      let data: unknown
      const contentType = response.headers.get('content-type') || ''
      const responseText = await response.text()

      if (contentType.includes('application/json')) {
        try {
          data = responseText ? JSON.parse(responseText) : {}
        } catch {
          data = responseText || ''
        }
      } else {
        data = responseText || ''
      }

      const requestHeaders: Record<string, string> = {}
      if (fetchOptions.headers) {
        Object.entries(fetchOptions.headers).forEach(([key, value]) => {
          requestHeaders[key] = String(value)
        })
      }

      const fullResponse = {
        request: {
          method: httpConfig.method || 'GET',
          url: normalizedUrl,
          headers: requestHeaders,
          body: httpConfig.body || null,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: data,
          rawBody: responseText,
        },
      }

      if (!response.ok) {
        return {
          success: false,
          data: fullResponse,
          error: `HTTP ${response.status}: ${response.statusText}`,
          metadata: {
            latencyMs,
            statusCode: response.status,
            headers: responseHeaders,
          },
        }
      }

      return {
        success: true,
        data: fullResponse,
        metadata: {
          latencyMs,
          statusCode: response.status,
          headers: responseHeaders,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during HTTP request',
      }
    }
  }

  async testQuery(
    config: Record<string, unknown>,
    usageConfig: Record<string, unknown>
  ): Promise<TestQueryResult> {
    const result = await this.execute(config, usageConfig)
    
    return {
      success: result.success,
      rowCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
      data: result.data,
      error: result.error,
    }
  }
}

export const httpExecutor = new HttpExecutor()
