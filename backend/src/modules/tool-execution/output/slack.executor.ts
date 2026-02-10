import type { ToolExecutor, TestConnectionResult, ExecuteResult } from '../executor.interface'

export interface SlackConfig {
  webhookUrl: string
}

interface SlackExecutionContext {
  appName: string
  output: unknown
  rawResponse?: string | null
  status: 'success' | 'error'
  latencyMs: number
  errorMessage?: string
}

/**
 * Builds the Slack webhook body.
 * The model's raw response is sent as-is when it's valid JSON.
 * Returns a string ready to use as the fetch body — no further encoding needed.
 */
function buildSlackBody(context: SlackExecutionContext): string {
  if (context.status === 'error' && context.errorMessage) {
    return JSON.stringify({ text: `Error: ${context.errorMessage}` })
  }

  // The model's raw response goes directly as the body — as-is
  if (context.rawResponse) {
    const trimmed = context.rawResponse.trim()
    // If it's valid JSON, send it straight to Slack
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      // Not JSON — wrap as plain text
      return JSON.stringify({ text: trimmed })
    }
  }

  if (context.output) {
    return JSON.stringify(
      typeof context.output === 'string' ? { text: context.output } : context.output
    )
  }

  return JSON.stringify({ text: 'Analysis completed with no output' })
}

export class SlackExecutor implements ToolExecutor {
  async testConnection(config: Record<string, unknown>): Promise<TestConnectionResult> {
    const slackConfig = config as unknown as SlackConfig

    if (!slackConfig.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
      }
    }

    if (!slackConfig.webhookUrl.includes('hooks.slack.com')) {
      return {
        success: false,
        error: 'Invalid Slack webhook URL',
      }
    }

    return { success: true }
  }

  async execute(
    config: Record<string, unknown>,
    _usageConfig: Record<string, unknown>
  ): Promise<ExecuteResult> {
    const slackConfig = config as unknown as SlackConfig

    if (!slackConfig.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
      }
    }

    const startTime = Date.now()

    try {
      const payload = {
        text: 'Test message from Alysis',
      }

      const response = await fetch(slackConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Slack API error: ${response.status} - ${errorText}`,
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
        error: error instanceof Error ? error.message : 'Unknown error sending to Slack',
      }
    }
  }

  async sendExecutionResult(
    config: SlackConfig,
    _usageConfig: Record<string, unknown>,
    context: SlackExecutionContext
  ): Promise<ExecuteResult> {
    if (!config.webhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured',
      }
    }

    const startTime = Date.now()

    try {
      const body = buildSlackBody(context)

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body,
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Slack API error: ${response.status} - ${errorText}`,
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
        error: error instanceof Error ? error.message : 'Unknown error sending to Slack',
      }
    }
  }
}

export const slackExecutor = new SlackExecutor()
