import { nanoid } from 'nanoid'
import { appRepository } from './app.repository'
import { promptRepository } from '../prompt/prompt.repository'
import { apiKeyService } from '../api-key/api-key.service'
import { inferVendor, getAllClients, getClient } from '../../clients'
import { DEFAULTS, ID_PREFIXES } from '../../shared/constants'
import { generateInterfaces } from '../../shared/interfaces'
import type { Analysis, CreateAnalysisDto, UpdateAnalysisDto } from '../../shared/types'

function generateAppId(name: string): string {
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 6)
    .replace(/-$/, '')
  return `${kebab}-${nanoid(5)}`
}

export const appService = {
  async create(dto: CreateAnalysisDto): Promise<{ analysis: Analysis; apiKey: { id: string; name: string; key: string } }> {
    const id = generateAppId(dto.name)
    const now = new Date()

    const analysis = await appRepository.create({
      id,
      name: dto.name,
      description: dto.description || null,
      status: 'active',
      sampleData: dto.sampleData || null,
    })

    const interfaces = dto.interfaces || generateInterfaces()
    const versionId = `${ID_PREFIXES.PROMPT_VERSION}${nanoid(10)}`
    await promptRepository.create({
      id: versionId,
      analysisId: id,
      version: 1,
      systemPrompt: dto.systemPrompt,
      interfaces,
      vendor: dto.vendor || inferVendor(dto.model),
      model: dto.model || DEFAULTS.MODEL,
      temperature: dto.temperature ?? DEFAULTS.TEMPERATURE,
      maxTokens: dto.maxTokens || DEFAULTS.MAX_TOKENS,
      responseFormat: dto.responseFormat || DEFAULTS.RESPONSE_FORMAT,
      publishedAt: now,
    })

    await appRepository.update(id, { activeVersionId: versionId })

    const apiKey = await apiKeyService.createForAnalysis(id)

    return {
      analysis: { ...analysis, activeVersionId: versionId },
      apiKey,
    }
  },

  async magic(description: string, vendor?: string, model?: string): Promise<{ name: string; description: string; systemPrompt: string; sampleData: string }> {
    const allClients = await getAllClients()
    
    let selectedClient
    let selectedModel: string
    
    if (vendor) {
      selectedClient = allClients.find(c => c.name === vendor && c.available)
      if (!selectedClient) {
        throw new Error(`Provider "${vendor}" is not available or not configured.`)
      }
      selectedModel = model || selectedClient.models[0].id
    } else {
      selectedClient = allClients.find(c => c.available)
      if (!selectedClient) {
        throw new Error('No AI provider configured. Please configure an API key in settings first.')
      }
      selectedModel = selectedClient.models[0].id
    }

    const client = getClient(selectedClient.name)

    const metaPrompt = `You are an expert AI Application Architect. 
Your goal is to design an AI analysis tool based on the user's description.
You MUST output a valid JSON object with the following fields:
- "title": A short, catchy name for the app (kebab-case or snake_case preferred for IDs, but human readable is fine).
- "short_description": A concise description (max 8 words).
- "analysis_instructions": A detailed system prompt for the AI model that will perform the analysis. It should clearly define the role, the input format, and the expected output behavior.
- "sample_data": A realistic example of input data (text or JSON) that this app would analyze.

Do not include markdown formatting like \`\`\`json. Return only the raw JSON.`

    const result = await client.complete(metaPrompt, `User Description: ${description}`, {
      model: selectedModel,
      temperature: 0.7,
      maxTokens: 2000,
      responseFormat: 'json'
    })

    try {
      const parsed = JSON.parse(result.content)
      return {
        name: parsed.title || 'generated-app',
        description: parsed.short_description || '',
        systemPrompt: parsed.analysis_instructions || '',
        sampleData: typeof parsed.sample_data === 'string' ? parsed.sample_data : JSON.stringify(parsed.sample_data, null, 2)
      }
    } catch (e) {
      throw new Error('Failed to parse AI response. Please try again.')
    }
  },

  async getAll(search?: string): Promise<Analysis[]> {
    return appRepository.findAll(search)
  },

  async getActive(): Promise<Analysis[]> {
    return appRepository.findActive()
  },

  async getById(id: string): Promise<Analysis | null> {
    return appRepository.findById(id)
  },

  async update(id: string, dto: UpdateAnalysisDto): Promise<Analysis | null> {
    const app = await appRepository.findById(id)
    if (!app) return null
    return appRepository.update(id, dto)
  },

  async delete(id: string): Promise<boolean> {
    const app = await appRepository.findById(id)
    if (!app) return false
    apiKeyService.deleteByAppId(id)
    return appRepository.delete(id)
  },

  async activate(id: string): Promise<Analysis | null> {
    const app = await appRepository.findById(id)
    if (!app) return null
    if (!app.activeVersionId) {
      throw new Error('Cannot activate app without a published prompt version')
    }
    return appRepository.update(id, { status: 'active' })
  },

  async deprecate(id: string): Promise<Analysis | null> {
    return appRepository.update(id, { status: 'deprecated' })
  },

  async getCount(): Promise<{ total: number; active: number }> {
    return appRepository.count()
  },
}
