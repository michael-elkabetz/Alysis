import type { AIResponse, ClientModel, ResponseFormat } from '../types'

export interface AIClientConfig {
  model: string
  temperature: number
  maxTokens: number
  responseFormat: ResponseFormat
}

export interface AIClient {
  name: string
  displayName: string
  isAvailable(): Promise<boolean>
  getModels(): ClientModel[]
  complete(systemPrompt: string, userInput: string, config: AIClientConfig): Promise<AIResponse>
}

export class ClientError extends Error {
  constructor(
    message: string,
    public client: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'ClientError'
  }
}
