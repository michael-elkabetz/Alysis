import { nanoid } from 'nanoid'
import { promptRepository, analysisRepository } from '../repositories'
import { inferVendor } from '../clients'
import type { PromptVersion, CreatePromptVersionDto } from '../types'

export const promptService = {
  async create(analysisId: string, dto: CreatePromptVersionDto): Promise<PromptVersion> {
    const maxVersion = await promptRepository.getMaxVersion(analysisId)
    const nextVersion = maxVersion + 1
    const id = `pv-${nanoid(10)}`
    const vendor = dto.vendor || inferVendor(dto.model)

    return promptRepository.create({
      id,
      analysisId,
      version: nextVersion,
      systemPrompt: dto.systemPrompt,
      vendor: vendor || 'openai',
      model: dto.model || 'gpt-5.2',
      temperature: dto.temperature ?? 0.7,
      maxTokens: dto.maxTokens || 4096,
      responseFormat: dto.responseFormat || 'json',
    })
  },

  async getAll(analysisId: string): Promise<PromptVersion[]> {
    return promptRepository.findByAnalysisId(analysisId)
  },

  async getById(analysisId: string, promptId: string): Promise<PromptVersion | null> {
    return promptRepository.findById(analysisId, promptId)
  },

  async getByVersionNumber(analysisId: string, versionNumber: number): Promise<PromptVersion | null> {
    return promptRepository.findByVersionNumber(analysisId, versionNumber)
  },

  async getLatest(analysisId: string): Promise<PromptVersion | null> {
    return promptRepository.findLatest(analysisId)
  },

  async getActive(analysisId: string): Promise<PromptVersion | null> {
    const analysis = await analysisRepository.findById(analysisId)
    if (!analysis?.activeVersionId) return null
    return promptRepository.findByIdOnly(analysis.activeVersionId)
  },

  async publish(analysisId: string, promptId: string): Promise<PromptVersion | null> {
    const version = await promptRepository.publish(analysisId, promptId)
    if (!version) return null
    await analysisRepository.update(analysisId, { activeVersionId: promptId })
    return version
  },
}
