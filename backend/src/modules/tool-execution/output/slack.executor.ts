import type { ToolExecutor, TestConnectionResult, ExecuteResult } from '../executor.interface'

export interface SlackConfig {
  webhookUrl: string
}

interface SlackExecutionContext {
  appName: string
  output: unknown
  status: 'success' | 'error'
  latencyMs: number
  errorMessage?: string
}

function formatSlackMessage(context: SlackExecutionContext): Record<string, unknown> {
  if (context.status === 'error' && context.errorMessage) {
    return { text: `Error: ${context.errorMessage}` }
  }

  if (context.output) {
    const outputStr = typeof context.output === 'string'
      ? context.output
      : JSON.stringify(context.output, null, 2)

    return { text: outputStr }
  }

  return { text: 'Analysis completed with no output' }
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
      const message = formatSlackMessage(context)

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
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
