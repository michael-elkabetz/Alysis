import { getClient } from '../../clients'
import { DEFAULTS } from '../../shared'

export const devToolsService = {
  async generateTyphoeusInterface(
    analysisName: string,
    jsonOutput: Record<string, unknown>
  ): Promise<string> {
    const client = getClient('openai') // We use OpenAI for code generation by default
    
    const prompt = `
You are an expert Ruby developer. Your task is to generate a Ruby client wrapper for an API endpoint using the 'typhoeus' gem.

Context:
- App Name: ${analysisName}
- The API returns a JSON response.
- Below is an EXAMPLE of the JSON output structure from this API.

Task:
- Create a Ruby class named \`${analysisName.replace(/[^a-zA-Z0-9]/g, '')}Client\`.
- It should have a method to call the API.
- It should use 'typhoeus' for the HTTP request.
- It should parse the response and return a structured object (using Struct or OpenStruct) that matches the JSON structure provided below.
- Include comments explaining usage.

Example JSON Output:
${JSON.stringify(jsonOutput, null, 2)}

Generate ONLY the Ruby code. Do not include markdown formatting like \`\`\`ruby.
`

    const response = await client.complete(
      prompt,
      '', // No user message needed, everything is in system prompt/context
      {
        model: 'gpt-4o', // Use a strong model for code generation
        temperature: 0.2, // Low temperature for deterministic code
        maxTokens: 2000,
        responseFormat: 'text'
      }
    )

    return response.content.replace(/```ruby/g, '').replace(/```/g, '').trim()
  }
}
