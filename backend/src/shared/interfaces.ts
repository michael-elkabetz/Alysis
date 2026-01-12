import type { AnalysisInterfaces } from './types'

export function generateInterfaces(): AnalysisInterfaces {
  return {
    output: {
      type: 'object',
      properties: {
        result: { type: 'object', description: 'Analysis result' },
      },
      required: ['result'],
    },
  }
}
