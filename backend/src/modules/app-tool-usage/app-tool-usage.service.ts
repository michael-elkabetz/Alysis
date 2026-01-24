import { nanoid } from 'nanoid'
import { appToolUsageRepository, type AppToolUsageWithInstance } from './app-tool-usage.repository'
import { toolInstanceRepository } from '../tool-instance/tool-instance.repository'
import { executorRegistry } from '../tool-execution/executor.registry'
import type { ExecutorType, JsonSchema } from '../../db/schema'

export interface CreateAppToolUsageDto {
  appId: string
  toolInstanceId: string
  enabled?: boolean
  usageConfig: Record<string, unknown>
}

export interface UpdateAppToolUsageDto {
  enabled?: boolean
  usageConfig?: Record<string, unknown>
}

export interface AppToolUsageResponse {
  id: string
  appId: string
  toolInstanceId: string
  enabled: boolean
  usageConfig: Record<string, unknown>
  instance: {
    id: string
    name: string
  }
  definition: {
    id: string
    name: string
    displayName: string
    category: string
    executorType: string
    usageSchema: JsonSchema
  }
  createdAt: Date
  updatedAt: Date
}

function toResponse(usage: AppToolUsageWithInstance): AppToolUsageResponse {
  return {
    id: usage.id,
    appId: usage.appId,
    toolInstanceId: usage.toolInstanceId,
    enabled: usage.enabled,
    usageConfig: usage.usageConfig,
    instance: {
      id: usage.instance.id,
      name: usage.instance.name,
    },
    definition: {
      id: usage.definition.id,
      name: usage.definition.name,
      displayName: usage.definition.displayName,
      category: usage.definition.category,
      executorType: usage.definition.executorType,
      usageSchema: usage.definition.usageSchema,
    },
    createdAt: usage.createdAt,
    updatedAt: usage.updatedAt,
  }
}

export const appToolUsageService = {
  async getByAppId(appId: string): Promise<AppToolUsageResponse[]> {
    const usages = await appToolUsageRepository.findByAppId(appId)
    return usages.map(toResponse)
  },

  async getById(id: string): Promise<AppToolUsageResponse | null> {
    const usage = await appToolUsageRepository.findById(id)
    return usage ? toResponse(usage) : null
  },

  async getByIdForApp(id: string, appId: string): Promise<AppToolUsageResponse | null> {
    const usage = await appToolUsageRepository.findById(id)
    if (!usage || usage.appId !== appId) return null
    return toResponse(usage)
  },

  async create(dto: CreateAppToolUsageDto): Promise<AppToolUsageResponse> {
    const instance = await toolInstanceRepository.findById(dto.toolInstanceId)
    if (!instance) {
      throw new Error(`Tool instance '${dto.toolInstanceId}' not found`)
    }

    const existing = await appToolUsageRepository.findByAppAndInstance(dto.appId, dto.toolInstanceId)
    if (existing) {
      throw new Error('This app already has a configuration for this tool instance')
    }

    const created = await appToolUsageRepository.create({
      id: `atu-${nanoid(10)}`,
      appId: dto.appId,
      toolInstanceId: dto.toolInstanceId,
      enabled: dto.enabled ?? true,
      usageConfig: dto.usageConfig,
    })

    const withRelations = await appToolUsageRepository.findById(created.id)
    if (!withRelations) {
      throw new Error('Failed to retrieve created usage')
    }

    return toResponse(withRelations)
  },

  async update(id: string, dto: UpdateAppToolUsageDto): Promise<AppToolUsageResponse> {
    const existing = await appToolUsageRepository.findById(id)
    if (!existing) {
      throw new Error(`App tool usage '${id}' not found`)
    }

    const updates: Record<string, unknown> = {}
    if (dto.enabled !== undefined) updates.enabled = dto.enabled
    if (dto.usageConfig !== undefined) updates.usageConfig = dto.usageConfig

    await appToolUsageRepository.update(id, updates)

    const updated = await appToolUsageRepository.findById(id)
    if (!updated) {
      throw new Error('Failed to retrieve updated usage')
    }

    return toResponse(updated)
  },

  async updateForApp(id: string, appId: string, dto: UpdateAppToolUsageDto): Promise<AppToolUsageResponse | null> {
    const existing = await appToolUsageRepository.findById(id)
    if (!existing || existing.appId !== appId) return null
    return this.update(id, dto)
  },

  async deleteForApp(id: string, appId: string): Promise<boolean | null> {
    const existing = await appToolUsageRepository.findById(id)
    if (!existing || existing.appId !== appId) return null
    return appToolUsageRepository.delete(id)
  },

  async toggleForApp(id: string, appId: string, enabled: boolean): Promise<AppToolUsageResponse | null> {
    const existing = await appToolUsageRepository.findById(id)
    if (!existing || existing.appId !== appId) return null
    return this.update(id, { enabled })
  },

  async testQueryForApp(id: string, appId: string): Promise<{ success: boolean; rowCount?: number; error?: string } | null> {
    const usage = await appToolUsageRepository.findById(id)
    if (!usage || usage.appId !== appId) return null
    const executorType = usage.definition.executorType as ExecutorType
    return executorRegistry.testQuery(executorType, usage.instance.config, usage.usageConfig)
  },

  async executeForApp(id: string, appId: string, overrideUsageConfig?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; rowCount?: number; error?: string } | null> {
    const usage = await appToolUsageRepository.findById(id)
    if (!usage || usage.appId !== appId) return null
    if (!usage.enabled) {
      return { success: false, error: 'Tool is disabled for this app' }
    }
    const executorType = usage.definition.executorType as ExecutorType
    const usageConfig = overrideUsageConfig || usage.usageConfig
    return executorRegistry.execute(executorType, usage.instance.config, usageConfig)
  },

  async upsert(appId: string, toolInstanceId: string, dto: UpdateAppToolUsageDto): Promise<AppToolUsageResponse> {
    const instance = await toolInstanceRepository.findById(toolInstanceId)
    if (!instance) {
      throw new Error(`Tool instance '${toolInstanceId}' not found`)
    }

    const existing = await appToolUsageRepository.findByAppAndInstance(appId, toolInstanceId)
    
    if (existing) {
      return this.update(existing.id, dto)
    }

    return this.create({
      appId,
      toolInstanceId,
      enabled: dto.enabled,
      usageConfig: dto.usageConfig ?? {},
    })
  },

  async delete(id: string): Promise<boolean> {
    const existing = await appToolUsageRepository.findById(id)
    if (!existing) {
      throw new Error(`App tool usage '${id}' not found`)
    }

    return appToolUsageRepository.delete(id)
  },

  async toggle(id: string, enabled: boolean): Promise<AppToolUsageResponse> {
    return this.update(id, { enabled })
  },

  async testQuery(id: string): Promise<{ success: boolean; rowCount?: number; error?: string }> {
    const usage = await appToolUsageRepository.findById(id)
    if (!usage) {
      return { success: false, error: `App tool usage '${id}' not found` }
    }

    const executorType = usage.definition.executorType as ExecutorType
    return executorRegistry.testQuery(executorType, usage.instance.config, usage.usageConfig)
  },

  async execute(id: string, overrideUsageConfig?: Record<string, unknown>): Promise<{ success: boolean; data?: unknown; rowCount?: number; error?: string }> {
    const usage = await appToolUsageRepository.findById(id)
    if (!usage) {
      return { success: false, error: `App tool usage '${id}' not found` }
    }

    if (!usage.enabled) {
      return { success: false, error: 'Tool is disabled for this app' }
    }

    const executorType = usage.definition.executorType as ExecutorType
    const usageConfig = overrideUsageConfig || usage.usageConfig
    return executorRegistry.execute(executorType, usage.instance.config, usageConfig)
  },

  async executeAllForApp(appId: string): Promise<Map<string, { success: boolean; data?: unknown; error?: string }>> {
    const usages = await appToolUsageRepository.findByAppId(appId)
    const enabledUsages = usages.filter(u => u.enabled)
    const results = new Map<string, { success: boolean; data?: unknown; error?: string }>()

    for (const usage of enabledUsages) {
      const executorType = usage.definition.executorType as ExecutorType
      const result = await executorRegistry.execute(executorType, usage.instance.config, usage.usageConfig)
      results.set(usage.definition.name, result)
    }

    return results
  },
}
