import Anthropic from '@anthropic-ai/sdk'
import type { AIClient, AIClientConfig } from './base'
import { ClientError } from './base'
import type { AIResponse, ClientModel } from '../types'
import { vendorKeyService } from '../services'

const ANTHROPIC_MODELS: ClientModel[] = [
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', contextWindow: 200000, maxOutput: 64000 },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000, maxOutput: 16000 },
]

export class AnthropicClient implements AIClient {
  name = 'anthropic' as const
  displayName = 'Anthropic'

  private async getClient(): Promise<Anthropic> {
    const apiKey = await vendorKeyService.getKeyForVendor('anthropic')
    if (!apiKey) {
      throw new ClientError('Anthropic API key not configured', this.name)
    }
    return new Anthropic({ apiKey })
  }

  async isAvailable(): Promise<boolean> {
    const apiKey = await vendorKeyService.getKeyForVendor('anthropic')
    return apiKey !== null
  }

  getModels(): ClientModel[] {
    return ANTHROPIC_MODELS
  }

  async complete(systemPrompt: string, userInput: string, config: AIClientConfig): Promise<AIResponse> {
    const client = await this.getClient()

    try {
      let finalSystemPrompt = systemPrompt
      if (config.responseFormat === 'json') {
        finalSystemPrompt += '\n\nIMPORTANT: You must respond with valid JSON only. No additional text or explanation.'
      }

      const response = await client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        system: finalSystemPrompt,
        messages: [{ role: 'user', content: userInput }],
      })

      const content = response.content[0]?.type === 'text' ? response.content[0].text : ''

      return {
        content,
        tokenUsage: {
          prompt: response.usage.input_tokens,
          completion: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
      }
    } catch (error) {
      throw new ClientError(
        `Anthropic API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error
      )
    }
  }
}
