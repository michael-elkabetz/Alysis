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

    const authType = config.authType as string
    if (authType && config.authToken && authType !== 'none' && authType !== 'None') {
      const headerName = config.authHeaderName || 'Authorization'

      if (authType === 'bearer' || authType === 'Bearer') {
        headers[headerName] = `Bearer ${config.authToken}`
      } else if (authType === 'basic' || authType === 'Basic') {
        headers[headerName] = `Basic ${config.authToken}`
      } else if (authType === 'api_key' || authType === 'API Key') {
        headers[headerName] = config.authToken
      }
    }

    return headers
  }

  async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    const httpConfig = config as unknown as HttpConfig
    const testUrl = httpConfig.url || (config.baseUrl as string)

    if (!testUrl) {
      return {
        success: false,
        error: 'No URL configured',
      }
    }

    try {
      const headers = this.buildHeaders(httpConfig)
      const normalizedUrl = this.normalizeUrl(testUrl)

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
    usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult> {
    const httpConfig = config as unknown as HttpConfig

    // usageConfig.endpoint takes priority over instance config's url.
    // The UI saves method/endpoint/body into usageConfig, so scheduled
    // execution must read from there — not only from the instance config.
    const hasUsageEndpoint = !!(usageConfig.endpoint as string)

    let method: string
    let url: string
    let body: string | undefined

    if (hasUsageEndpoint) {
      const endpoint = usageConfig.endpoint as string
      const methodFromUsage = (usageConfig.method as string) || httpConfig.method || 'GET'
      method = methodFromUsage
      const baseUrl = (config.baseUrl as string) || ''
      const normalizedBaseUrl = baseUrl ? this.normalizeUrl(baseUrl) : ''
      url = normalizedBaseUrl
        ? `${normalizedBaseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\/+/, '')}`
        : this.normalizeUrl(endpoint)
      body = usageConfig.body as string | undefined
    } else if (httpConfig.url && httpConfig.method) {
      method = httpConfig.method || 'GET'
      url = this.normalizeUrl(httpConfig.url)
      body = ['POST', 'PUT', 'PATCH'].includes(method) ? httpConfig.body : undefined
    } else {
      return {
        success: false,
        error: 'No endpoint configured',
      }
    }

    const startTime = Date.now()

    try {
      const headers = this.buildHeaders(httpConfig)

      const fetchOptions: RequestInit = {
        method,
        headers,
      }

      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        fetchOptions.body = body
      }

      const response = await fetch(url, fetchOptions)
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
          method,
          url,
          headers: requestHeaders,
          body: body || null,
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
