import { nanoid } from 'nanoid'
import { toolDefinitionRepository } from './tool-definition.repository'
import type { ToolDefinitionRow, NewToolDefinition, ToolCategory, ExecutorType, ToolDirection, JsonSchema } from '../../db/schema'

const VALID_CATEGORIES = ['database', 'http', 'storage', 'notification', 'custom'] as const
const VALID_EXECUTOR_TYPES = ['sql', 'http', 'storage', 'notification', 'webhook', 'custom'] as const

const BUILT_IN_TOOLS: NewToolDefinition[] = [
  {
    id: 'td-snowflake',
    name: 'snowflake',
    displayName: 'Snowflake',
    description: 'Cloud data warehouse for analytics and data storage',
    category: 'database',
    executorType: 'sql',
    direction: 'input',
    configSchema: {
      type: 'object',
      properties: {
        account: { type: 'string', description: 'Snowflake account identifier (e.g., abc12345.us-east-1)' },
        user: { type: 'string', description: 'Username for authentication' },
        warehouse: { type: 'string', description: 'Compute warehouse name' },
        database: { type: 'string', description: 'Default database name' },
        schema: { type: 'string', description: 'Default schema name' },
        role: { type: 'string', description: 'User role for access control' },
        password: { type: 'string', format: 'password', description: 'Password for authentication' },
        privateKey: { type: 'string', format: 'textarea', description: 'Private key for key-pair authentication (PEM format)' },
        privateKeyPassword: { type: 'string', format: 'password', description: 'Passphrase for encrypted private key' },
      },
      required: ['account', 'user', 'warehouse', 'database', 'role'],
    },
    usageSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', format: 'textarea', description: 'SQL query to execute' },
      },
      required: ['query'],
    },
    builtIn: true,
  },
  {
    id: 'td-postgres',
    name: 'postgres',
    displayName: 'PostgreSQL',
    description: 'Open-source relational database system',
    category: 'database',
    executorType: 'sql',
    direction: 'input',
    configSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Database server hostname' },
        port: { type: 'number', description: 'Database server port', default: 5432 },
        database: { type: 'string', description: 'Database name' },
        user: { type: 'string', description: 'Username for authentication' },
        password: { type: 'string', format: 'password', description: 'Password for authentication' },
        ssl: { type: 'boolean', description: 'Enable SSL connection', default: false },
      },
      required: ['host', 'database', 'user'],
    },
    usageSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', format: 'textarea', description: 'SQL query to execute' },
      },
      required: ['query'],
    },
    builtIn: true,
  },
  {
    id: 'td-http',
    name: 'http',
    displayName: 'HTTP Request',
    description: 'Make HTTP/REST API calls to external services',
    category: 'http',
    executorType: 'http',
    direction: 'input',
    configSchema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], description: 'HTTP method', default: 'GET' },
        url: { type: 'string', format: 'uri', description: 'Full URL for the request' },
        authType: { type: 'string', enum: ['none', 'bearer', 'basic', 'api_key'], description: 'Authentication type', default: 'none' },
        authHeaderName: { type: 'string', description: 'Header name for authentication (e.g., Authorization, X-API-Key)', default: 'Authorization' },
        authToken: { type: 'string', format: 'password', description: 'Token / API Key / Password' },
        body: { type: 'string', format: 'textarea', description: 'Request body (for POST/PUT/PATCH)' },
      },
      required: ['method', 'url'],
    },
    usageSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    builtIn: true,
  },
  {
    id: 'td-slack',
    name: 'slack',
    displayName: 'Slack',
    description: 'Send scheduled analysis results to Slack via webhook',
    category: 'notification',
    executorType: 'notification',
    direction: 'output',
    configSchema: {
      type: 'object',
      properties: {
        webhookUrl: { type: 'string', format: 'password', description: 'Slack Incoming Webhook URL (channel is configured in Slack)' },
      },
      required: ['webhookUrl'],
    },
    usageSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    builtIn: true,
  },
  {
    id: 'td-webhook',
    name: 'webhook',
    displayName: 'Webhook',
    description: 'Send scheduled analysis results to any HTTP endpoint',
    category: 'notification',
    executorType: 'webhook',
    direction: 'output',
    configSchema: {
      type: 'object',
      properties: {
        webhookUrl: { type: 'string', format: 'uri', description: 'HTTP endpoint URL to receive the webhook payload' },
        method: { type: 'string', enum: ['POST', 'PUT', 'PATCH'], description: 'HTTP method for the webhook request', default: 'POST' },
        headers: { type: 'string', format: 'textarea', description: 'Custom headers as JSON (e.g., {"Authorization": "Bearer token"})' },
      },
      required: ['webhookUrl'],
    },
    usageSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    builtIn: true,
  },
]

export interface CreateToolDefinitionDto {
  name: string
  displayName: string
  description?: string
  category: ToolCategory
  executorType: ExecutorType
  direction?: ToolDirection
  configSchema: JsonSchema
  usageSchema: JsonSchema
}

export interface UpdateToolDefinitionDto {
  displayName?: string
  description?: string
  configSchema?: JsonSchema
  usageSchema?: JsonSchema
}

export interface ToolDefinitionResponse {
  id: string
  name: string
  displayName: string
  description: string | null
  category: ToolCategory
  executorType: ExecutorType
  direction: ToolDirection
  configSchema: JsonSchema
  usageSchema: JsonSchema
  builtIn: boolean
  createdAt: Date
  updatedAt: Date
}

function toResponse(definition: ToolDefinitionRow): ToolDefinitionResponse {
  return {
    id: definition.id,
    name: definition.name,
    displayName: definition.displayName,
    description: definition.description,
    category: definition.category as ToolCategory,
    executorType: definition.executorType as ExecutorType,
    direction: (definition.direction as ToolDirection) || 'input',
    configSchema: definition.configSchema,
    usageSchema: definition.usageSchema,
    builtIn: definition.builtIn,
    createdAt: definition.createdAt,
    updatedAt: definition.updatedAt,
  }
}

export const toolDefinitionService = {
  isValidCategory(category: string): category is ToolCategory {
    return VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])
  },

  isValidExecutorType(executorType: string): executorType is ExecutorType {
    return VALID_EXECUTOR_TYPES.includes(executorType as typeof VALID_EXECUTOR_TYPES[number])
  },

  getValidCategories(): readonly string[] {
    return VALID_CATEGORIES
  },

  async getAll(): Promise<ToolDefinitionResponse[]> {
    const definitions = await toolDefinitionRepository.findAll()
    return definitions.map(toResponse)
  },

  async getById(id: string): Promise<ToolDefinitionResponse | null> {
    const definition = await toolDefinitionRepository.findById(id)
    return definition ? toResponse(definition) : null
  },

  async getByName(name: string): Promise<ToolDefinitionResponse | null> {
    const definition = await toolDefinitionRepository.findByName(name)
    return definition ? toResponse(definition) : null
  },

  async getByCategory(category: ToolCategory): Promise<ToolDefinitionResponse[]> {
    const definitions = await toolDefinitionRepository.findByCategory(category)
    return definitions.map(toResponse)
  },

  async create(dto: CreateToolDefinitionDto): Promise<ToolDefinitionResponse> {
    const existing = await toolDefinitionRepository.findByName(dto.name)
    if (existing) {
      throw new Error(`Tool definition with name '${dto.name}' already exists`)
    }

    const newDefinition: NewToolDefinition = {
      id: `td-${nanoid(10)}`,
      name: dto.name,
      displayName: dto.displayName,
      description: dto.description || null,
      category: dto.category,
      executorType: dto.executorType,
      direction: dto.direction || 'input',
      configSchema: dto.configSchema,
      usageSchema: dto.usageSchema,
      builtIn: false,
    }

    const created = await toolDefinitionRepository.create(newDefinition)
    return toResponse(created)
  },

  async update(id: string, dto: UpdateToolDefinitionDto): Promise<ToolDefinitionResponse> {
    const existing = await toolDefinitionRepository.findById(id)
    if (!existing) {
      throw new Error(`Tool definition '${id}' not found`)
    }

    if (existing.builtIn) {
      const { displayName, description } = dto
      const limitedUpdates: Partial<NewToolDefinition> = {}
      if (displayName !== undefined) limitedUpdates.displayName = displayName
      if (description !== undefined) limitedUpdates.description = description
      
      const updated = await toolDefinitionRepository.update(id, limitedUpdates)
      if (!updated) throw new Error(`Failed to update tool definition '${id}'`)
      return toResponse(updated)
    }

    const updates: Partial<NewToolDefinition> = {}
    if (dto.displayName !== undefined) updates.displayName = dto.displayName
    if (dto.description !== undefined) updates.description = dto.description
    if (dto.configSchema !== undefined) updates.configSchema = dto.configSchema
    if (dto.usageSchema !== undefined) updates.usageSchema = dto.usageSchema

    const updated = await toolDefinitionRepository.update(id, updates)
    if (!updated) throw new Error(`Failed to update tool definition '${id}'`)
    return toResponse(updated)
  },

  async delete(id: string): Promise<boolean> {
    const existing = await toolDefinitionRepository.findById(id)
    if (!existing) {
      throw new Error(`Tool definition '${id}' not found`)
    }

    if (existing.builtIn) {
      throw new Error('Cannot delete built-in tool definitions')
    }

    return toolDefinitionRepository.delete(id)
  },

  async getCategories(): Promise<{ category: ToolCategory; count: number }[]> {
    const definitions = await toolDefinitionRepository.findAll()
    const categoryMap = new Map<ToolCategory, number>()

    for (const def of definitions) {
      const category = def.category as ToolCategory
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
    }

    return Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }))
  },

  async seedBuiltInTools(): Promise<void> {
    for (const tool of BUILT_IN_TOOLS) {
      try {
        const existing = await toolDefinitionRepository.findById(tool.id)
        if (!existing) {
          await toolDefinitionRepository.create(tool)
        }
      } catch (error) {
      }
    }
  },

  async initialize(): Promise<void> {
    try {
      const existing = await toolDefinitionRepository.findAll()
      
      if (existing.length === 0) {
        await this.seedBuiltInTools()
      } else {
        const existingIds = new Set(existing.map(t => t.id))
        const missingTools = BUILT_IN_TOOLS.filter(t => !existingIds.has(t.id))
        
        if (missingTools.length > 0) {
          for (const tool of missingTools) {
            try {
              await toolDefinitionRepository.create(tool)
            } catch (err) {
            }
          }
        }
      }
    } catch (error) {
    }
  },
}
