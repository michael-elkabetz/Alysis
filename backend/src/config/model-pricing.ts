export interface ModelPricing {
  inputPricePerMillion: number
  outputPricePerMillion: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5.2': { inputPricePerMillion: 2.50, outputPricePerMillion: 10.00 },
  'gpt-4o': { inputPricePerMillion: 2.50, outputPricePerMillion: 10.00 },
  'claude-opus-4-5-20251101': { inputPricePerMillion: 5.00, outputPricePerMillion: 25.00 },
  'claude-sonnet-4-20250514': { inputPricePerMillion: 3.00, outputPricePerMillion: 15.00 },
  'gemini-3-pro-preview': { inputPricePerMillion: 2.00, outputPricePerMillion: 12.00 },
  'gemini-2.5-flash': { inputPricePerMillion: 0.30, outputPricePerMillion: 2.50 },
}

export function getModelPricing(model: string): ModelPricing {
  return MODEL_PRICING[model] || { inputPricePerMillion: 0, outputPricePerMillion: 0 }
}
