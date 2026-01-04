import { GoogleGenAI } from '@google/genai'
import type { AIClient, AIClientConfig } from './base'
import { ClientError } from './base'
import type { AIResponse, ClientModel } from '../types'
import { vendorKeyService } from '../services'

const GEMINI_MODELS: ClientModel[] = [
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', contextWindow: 1000000, maxOutput: 64000 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576, maxOutput: 65536 },
]

export class GeminiClient implements AIClient {
  name = 'gemini' as const
  displayName = 'Google Gemini'

  private async getClient(): Promise<GoogleGenAI> {
    const apiKey = await vendorKeyService.getKeyForVendor('gemini')
    if (!apiKey) {
      throw new ClientError('Gemini API key not configured', this.name)
    }
    return new GoogleGenAI({ apiKey })
  }

  async isAvailable(): Promise<boolean> {
    const apiKey = await vendorKeyService.getKeyForVendor('gemini')
    return apiKey !== null
  }

  getModels(): ClientModel[] {
    return GEMINI_MODELS
  }

  async complete(systemPrompt: string, userInput: string, config: AIClientConfig): Promise<AIResponse> {
    const client = await this.getClient()

    try {
      const isJsonMode = config.responseFormat === 'json'
      let finalSystemPrompt = systemPrompt
      if (isJsonMode && !systemPrompt.toLowerCase().includes('json')) {
        finalSystemPrompt += '\n\nYou must respond with valid JSON only. No additional text or explanation.'
      }

      const response = await client.models.generateContent({
        model: config.model,
        contents: userInput,
        config: {
          systemInstruction: finalSystemPrompt,
          temperature: config.temperature,
          maxOutputTokens: config.maxTokens,
          responseMimeType: isJsonMode ? 'application/json' : 'text/plain',
        },
      })

      const content = response.text || ''
      const usage = response.usageMetadata

      return {
        content,
        tokenUsage: {
          prompt: usage?.promptTokenCount || 0,
          completion: usage?.candidatesTokenCount || 0,
          total: usage?.totalTokenCount || 0,
        },
      }
    } catch (error) {
      throw new ClientError(
        `Gemini API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        error
      )
    }
  }
}
