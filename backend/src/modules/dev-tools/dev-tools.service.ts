import { getClient } from '../../clients'

export const devToolsService = {
  async generateTyphoeusInterface(
    analysisName: string,
    jsonOutput: Record<string, unknown>
  ): Promise<string> {
    void analysisName
    const client = getClient('openai')
    
    const prompt = `
You are an expert TypeScript developer. Your task is to generate TypeScript interface definitions based on a JSON structure.

Context:
- The JSON below represents the output structure from an API.
- Generate clean, well-typed TypeScript interfaces.

Task:
- Analyze the JSON structure below
- Generate TypeScript interface(s) that accurately represent this data
- Use proper naming conventions (PascalCase for interfaces)
- Include nested interfaces if needed
- Add JSDoc comments for clarity

Example JSON Output:
${JSON.stringify(jsonOutput, null, 2)}

Generate ONLY the TypeScript interface code. Do not include markdown code fences or explanations.
`

    const response = await client.complete(
      prompt,
      '',
      {
        model: 'gpt-4o',
        temperature: 0.2,
        maxTokens: 2000,
        responseFormat: 'text'
      }
    )

    return response.content.replace(/```typescript/g, '').replace(/```ts/g, '').replace(/```/g, '').trim()
  }
}
