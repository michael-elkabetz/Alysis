import { nanoid } from 'nanoid'
import { analysisRepository, promptRepository } from '../repositories'
import { inferVendor } from '../clients'
import { apiKeyService } from './apikey.service'
import type { Analysis, CreateAnalysisDto, UpdateAnalysisDto } from '../types'

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
    })

    const versionId = `pv-${nanoid(10)}`
    await promptRepository.create({
      id: versionId,
      analysisId: id,
      version: 1,
      systemPrompt: dto.systemPrompt,
      vendor: dto.vendor || inferVendor(dto.model),
      model: dto.model || 'gpt-4o',
      temperature: dto.temperature ?? 0.7,
      maxTokens: dto.maxTokens || 4096,
      responseFormat: dto.responseFormat || 'json',
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
