import { nanoid } from 'nanoid'
import { toolInstanceRepository, type ToolInstanceWithDefinition } from './tool-instance.repository'
import { toolDefinitionRepository } from '../tool-definition/tool-definition.repository'
import { executorRegistry } from '../tool-execution/executor.registry'
import type { NewToolInstance, ExecutorType, JsonSchema } from '../../db/schema'

export interface CreateToolInstanceDto {
  toolDefinitionId: string
  name: string
  config: Record<string, unknown>
}

export interface UpdateToolInstanceDto {
  name?: string
  config?: Record<string, unknown>
}

export interface ToolInstanceResponse {
  id: string
  name: string
  toolDefinitionId: string
  config: Record<string, unknown>
  maskedConfig: Record<string, unknown>
  definition: {
    id: string
    name: string
    displayName: string
    category: string
    executorType: string
    configSchema: JsonSchema
    usageSchema: JsonSchema
    builtIn: boolean
  }
  createdAt: Date
  updatedAt: Date
}

export interface ToolInstanceStatus {
  id: string
  name: string
  toolDefinitionId: string
  definitionName: string
  displayName: string
  category: string
  executorType: string
  configured: boolean
  maskedConfig: Record<string, unknown>
  updatedAt: Date
}

function maskConfig(config: Record<string, unknown>, schema: JsonSchema): Record<string, unknown> {
  const masked: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(config)) {
    const propSchema = schema.properties[key]
    
    if (propSchema?.format === 'password' || key.toLowerCase().includes('password') || 
        key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('key') && key !== 'apiKeyHeader') {
      masked[key] = value ? '••••••••' : undefined
    } else {
      masked[key] = value
    }
  }

  return masked
}

function toResponse(instance: ToolInstanceWithDefinition): ToolInstanceResponse {
  return {
    id: instance.id,
    name: instance.name,
    toolDefinitionId: instance.toolDefinitionId,
    config: instance.config,
    maskedConfig: maskConfig(instance.config, instance.definition.configSchema),
    definition: {
      ...instance.definition,
      configSchema: instance.definition.configSchema,
      usageSchema: instance.definition.usageSchema,
    },
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  }
}

function toStatus(instance: ToolInstanceWithDefinition): ToolInstanceStatus {
  return {
    id: instance.id,
    name: instance.name,
    toolDefinitionId: instance.toolDefinitionId,
    definitionName: instance.definition.name,
    displayName: instance.definition.displayName,
    category: instance.definition.category,
    executorType: instance.definition.executorType,
    configured: true,
    maskedConfig: maskConfig(instance.config, instance.definition.configSchema),
    updatedAt: instance.updatedAt,
  }
}

export const toolInstanceService = {
  async getAll(): Promise<ToolInstanceResponse[]> {
    const instances = await toolInstanceRepository.findAll()
    return instances.map(toResponse)
  },

  async getAllStatuses(): Promise<ToolInstanceStatus[]> {
    const instances = await toolInstanceRepository.findAll()
    return instances.map(toStatus)
  },

  async getById(id: string): Promise<ToolInstanceResponse | null> {
    const instance = await toolInstanceRepository.findById(id)
    return instance ? toResponse(instance) : null
  },

  async getByDefinitionId(definitionId: string): Promise<ToolInstanceResponse[]> {
    const instances = await toolInstanceRepository.findByDefinitionId(definitionId)
    return instances.map(toResponse)
  },

  async create(dto: CreateToolInstanceDto): Promise<ToolInstanceResponse> {
    const definition = await toolDefinitionRepository.findById(dto.toolDefinitionId)
    if (!definition) {
      throw new Error(`Tool definition '${dto.toolDefinitionId}' not found`)
    }

    const newInstance: NewToolInstance = {
      id: `ti-${nanoid(10)}`,
      toolDefinitionId: dto.toolDefinitionId,
      name: dto.name,
      config: dto.config,
    }

    const created = await toolInstanceRepository.create(newInstance)
    const withDefinition = await toolInstanceRepository.findById(created.id)
    
    if (!withDefinition) {
      throw new Error('Failed to retrieve created instance')
    }

    return toResponse(withDefinition)
  },

  async update(id: string, dto: UpdateToolInstanceDto): Promise<ToolInstanceResponse> {
    const existing = await toolInstanceRepository.findById(id)
    if (!existing) {
      throw new Error(`Tool instance '${id}' not found`)
    }

    let finalConfig = dto.config
    if (dto.config && existing.config) {
      finalConfig = { ...dto.config }

      for (const [key, propSchema] of Object.entries(existing.definition.configSchema.properties)) {
        if ((propSchema.format === 'password' || key.toLowerCase().includes('password') ||
            key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') ||
            (key.toLowerCase().includes('key') && key !== 'apiKeyHeader')) &&
            !dto.config[key] && existing.config[key]) {
          finalConfig[key] = existing.config[key]
        }
      }
    }

    const updates: Partial<NewToolInstance> = {}
    if (dto.name !== undefined) updates.name = dto.name
    if (finalConfig !== undefined) updates.config = finalConfig

    const updated = await toolInstanceRepository.update(id, updates)
    if (!updated) {
      throw new Error(`Failed to update tool instance '${id}'`)
    }

    const withDefinition = await toolInstanceRepository.findById(id)
    if (!withDefinition) {
      throw new Error('Failed to retrieve updated instance')
    }

    return toResponse(withDefinition)
  },

  async delete(id: string): Promise<boolean> {
    const existing = await toolInstanceRepository.findById(id)
    if (!existing) {
      throw new Error(`Tool instance '${id}' not found`)
    }

    return toolInstanceRepository.delete(id)
  },

  async testConnection(id: string): Promise<{ success: boolean; error?: string }> {
    const instance = await toolInstanceRepository.findById(id)
    if (!instance) {
      return { success: false, error: `Tool instance '${id}' not found` }
    }

    const executorType = instance.definition.executorType as ExecutorType
    return executorRegistry.testConnection(executorType, instance.config)
  },

  async testQuery(
    id: string,
    usageConfig: Record<string, unknown>
  ): Promise<{ success: boolean; rowCount?: number; data?: unknown; error?: string }> {
    const instance = await toolInstanceRepository.findById(id)
    if (!instance) {
      return { success: false, error: `Tool instance '${id}' not found` }
    }

    const executorType = instance.definition.executorType as ExecutorType
    return executorRegistry.testQuery(executorType, instance.config, usageConfig)
  },

  async execute(
    id: string,
    usageConfig: Record<string, unknown>
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const instance = await toolInstanceRepository.findById(id)
    if (!instance) {
      return { success: false, error: `Tool instance '${id}' not found` }
    }

    const executorType = instance.definition.executorType as ExecutorType
    return executorRegistry.execute(executorType, instance.config, usageConfig)
  },
}
