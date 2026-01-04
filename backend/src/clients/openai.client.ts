import OpenAI from 'openai'
import type { AIClient, AIClientConfig } from './base'
import { ClientError } from './base'
import type { AIResponse, ClientModel } from '../types'
import { vendorKeyService } from '../services'

const OPENAI_MODELS: ClientModel[] = [
  { id: 'gpt-5.2', name: 'GPT 5.2', contextWindow: 400000, maxOutput: 128000 },
  { id: 'gpt-4o', name: 'GPT 4o', contextWindow: 128000, maxOutput: 16384 },
]

export class OpenAIClient implements AIClient {
  name = 'openai' as const
  displayName = 'OpenAI'

  private async getClient(): Promise<OpenAI> {
    const apiKey = await vendorKeyService.getKeyForVendor('openai')
    if (!apiKey) {
      throw new ClientError('OpenAI API key not configured', this.name)
    }
    return new OpenAI({ apiKey })
  }

  async isAvailable(): Promise<boolean> {
    const apiKey = await vendorKeyService.getKeyForVendor('openai')
    return apiKey !== null
  }

  getModels(): ClientModel[] {
    return OPENAI_MODELS
  }

  async complete(systemPrompt: string, userInput: string, config: AIClientConfig): Promise<AIResponse> {
    const client = await this.getClient()

    try {
      const isJsonMode = config.responseFormat === 'json'
      const finalSystemPrompt = isJsonMode && !systemPrompt.toLowerCase().includes('json')
        ? `${systemPrompt}\n\nYou must respond with valid JSON.`
        : systemPrompt

      const response = await client.chat.completions.create({
        model: config.model,
        temperature: config.temperature,
        max_completion_tokens: config.maxTokens,
        response_format: isJsonMode ? { type: 'json_object' } : { type: 'text' },
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userInput },
        ],
      })

      const content = response.choices[0]?.message?.content || ''
      const usage = response.usage

      return {
        content,
        tokenUsage: {
          prompt: usage?.prompt_tokens || 0,
          completion: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      throw new ClientError(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error
      )
    }
  }
}
