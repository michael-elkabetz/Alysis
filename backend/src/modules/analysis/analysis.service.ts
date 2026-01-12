import { nanoid } from 'nanoid'
import { analysisRepository } from './analysis.repository'
import { promptRepository } from '../prompt/prompt.repository'
import { apiKeyService } from '../api-key/apikey.service'
import { inferVendor } from '../../clients'
import { DEFAULTS, ID_PREFIXES } from '../../shared/constants'
import { generateInterfaces } from '../../shared/interfaces'
import type { Analysis, CreateAnalysisDto, UpdateAnalysisDto } from '../../shared/types'

function generateAnalysisId(name: string): string {
  const kebab = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 6)
    .replace(/-$/, '')
  return `${kebab}-${nanoid(5)}`
}

export const analysisService = {
  async create(dto: CreateAnalysisDto): Promise<{ analysis: Analysis; apiKey: { id: string; name: string; key: string } }> {
    const id = generateAnalysisId(dto.name)
    const now = new Date()

    const analysis = await analysisRepository.create({
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

    await analysisRepository.update(id, { activeVersionId: versionId })

    const apiKey = await apiKeyService.createForAnalysis(id)

    return {
      analysis: { ...analysis, activeVersionId: versionId },
      apiKey,
    }
  },

  async getAll(search?: string): Promise<Analysis[]> {
    return analysisRepository.findAll(search)
  },

  async getActive(): Promise<Analysis[]> {
    return analysisRepository.findActive()
  },

  async getById(id: string): Promise<Analysis | null> {
    return analysisRepository.findById(id)
  },

  async update(id: string, dto: UpdateAnalysisDto): Promise<Analysis | null> {
    const analysis = await analysisRepository.findById(id)
    if (!analysis) return null
    return analysisRepository.update(id, dto)
  },

  async delete(id: string): Promise<boolean> {
    const analysis = await analysisRepository.findById(id)
    if (!analysis) return false
    return analysisRepository.delete(id)
  },

  async activate(id: string): Promise<Analysis | null> {
    const analysis = await analysisRepository.findById(id)
    if (!analysis) return null
    if (!analysis.activeVersionId) {
      throw new Error('Cannot activate analysis without a published prompt version')
    }
    return analysisRepository.update(id, { status: 'active' })
  },

  async deprecate(id: string): Promise<Analysis | null> {
    return analysisRepository.update(id, { status: 'deprecated' })
  },

  async getCount(): Promise<{ total: number; active: number }> {
    return analysisRepository.count()
  },
}
