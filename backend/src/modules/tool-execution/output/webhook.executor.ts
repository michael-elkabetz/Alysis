import type { ToolExecutor, TestConnectionResult, ExecuteResult } from '../executor.interface'

export interface WebhookConfig {
  webhookUrl: string
  method?: 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
}

export interface WebhookExecutionContext {
  appName: string
  output: unknown
  status: 'success' | 'error'
  latencyMs: number
  errorMessage?: string
}

function formatWebhookPayload(context: WebhookExecutionContext): Record<string, unknown> {
  return {
    appName: context.appName,
    status: context.status,
    latencyMs: context.latencyMs,
    timestamp: new Date().toISOString(),
    ...(context.status === 'error' && context.errorMessage
      ? { error: context.errorMessage }
      : { data: context.output }),
  }
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed.match(/^https?:\/\//i)) {
    return `https://${trimmed}`
  }
  return trimmed
}

function isValidUrl(url: string): boolean {
  try {
    const normalized = normalizeUrl(url)
    const parsed = new URL(normalized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export class WebhookExecutor implements ToolExecutor {
  async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    const webhookConfig = config as unknown as WebhookConfig

    if (!webhookConfig.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
      }
    }

    if (!isValidUrl(webhookConfig.webhookUrl)) {
      return {
        success: false,
        error: 'Invalid webhook URL format',
      }
    }

    return { success: true }
  }

  async execute(
    config: Record<string, unknown>,
    _usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult> {
    const webhookConfig = config as unknown as WebhookConfig

    if (!webhookConfig.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
      }
    }

    const startTime = Date.now()

    try {
      const payload = {
        message: 'Test message from Alysis',
        timestamp: new Date().toISOString(),
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...webhookConfig.headers,
      }

      const response = await fetch(normalizeUrl(webhookConfig.webhookUrl), {
        method: webhookConfig.method || 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Webhook error: ${response.status} - ${errorText}`,
          metadata: { latencyMs },
        }
      }

      return {
        success: true,
        data: { sent: true },
        metadata: { latencyMs },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending webhook',
      }
    }
  }

  async sendExecutionResult(
    config: WebhookConfig,
    _usageConfig: Record<string, unknown>,
    context: WebhookExecutionContext
  ): Promise<ExecuteResult> {
    if (!config.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
      }
    }

    const startTime = Date.now()

    try {
      const payload = formatWebhookPayload(context)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...config.headers,
      }

      const response = await fetch(normalizeUrl(config.webhookUrl), {
        method: config.method || 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Webhook error: ${response.status} - ${errorText}`,
          metadata: { latencyMs },
        }
      }

      return {
        success: true,
        data: { sent: true },
        metadata: { latencyMs },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error sending webhook',
      }
    }
  }
}

export const webhookExecutor = new WebhookExecutor()
