import { Elysia, t } from 'elysia'
import { toolConfigService } from './tool-config.service'
import type { ToolType, SnowflakeConfig, PostgresConfig } from '../../shared/types'

const validToolTypes = ['snowflake', 'postgres'] as const

function isValidToolType(toolType: string): toolType is ToolType {
  return validToolTypes.includes(toolType as typeof validToolTypes[number])
}

export const toolConfigController = new Elysia({ prefix: '/api/v1/tool-configs' })
  .get('/', async () => {
    return toolConfigService.getStatuses()
  }, {
    detail: { tags: ['Tool Configs'], summary: 'List all tool configuration statuses' },
  })

  .get('/:toolType', async ({ params, set }) => {
    const toolType = params.toolType

    if (!isValidToolType(toolType)) {
      set.status = 400
      return { error: `Invalid tool type: ${toolType}` }
    }

    const statuses = await toolConfigService.getStatuses()
    return statuses.find((s) => s.toolType === toolType)
  }, {
    params: t.Object({ toolType: t.String() }),
    detail: { tags: ['Tool Configs'], summary: 'Get specific tool configuration status' },
  })

  .put('/:toolType', async ({ params, body, set }) => {
    const toolType = params.toolType

    if (!isValidToolType(toolType)) {
      set.status = 400
      return { error: `Invalid tool type: ${toolType}` }
    }

    try {
      const result = await toolConfigService.upsertConfig(toolType, body as SnowflakeConfig | PostgresConfig)
      return result
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to save tool config' }
    }
  }, {
    params: t.Object({ toolType: t.String() }),
    body: t.Union([
      t.Object({
        account: t.String({ minLength: 1 }),
        user: t.String({ minLength: 1 }),
        warehouse: t.String({ minLength: 1 }),
        database: t.String({ minLength: 1 }),
        schema: t.Optional(t.String()),
        role: t.String({ minLength: 1 }),
        privateKey: t.Optional(t.String()),
        privateKeyPassword: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
      t.Object({
        host: t.String({ minLength: 1 }),
        port: t.Number(),
        database: t.String({ minLength: 1 }),
        user: t.String({ minLength: 1 }),
        password: t.Optional(t.String()),
      }),
    ]),
    detail: { tags: ['Tool Configs'], summary: 'Create or update tool configuration' },
  })

  .delete('/:toolType', async ({ params, set }) => {
    const toolType = params.toolType

    if (!isValidToolType(toolType)) {
      set.status = 400
      return { error: `Invalid tool type: ${toolType}` }
    }

    await toolConfigService.deleteConfig(toolType)
    return { success: true }
  }, {
    params: t.Object({ toolType: t.String() }),
    detail: { tags: ['Tool Configs'], summary: 'Delete tool configuration' },
  })

  .post('/:toolType/test', async ({ params, set }) => {
    const toolType = params.toolType

    if (!isValidToolType(toolType)) {
      set.status = 400
      return { error: `Invalid tool type: ${toolType}` }
    }

    return toolConfigService.testConnection(toolType)
  }, {
    params: t.Object({ toolType: t.String() }),
    detail: { tags: ['Tool Configs'], summary: 'Test tool connection' },
  })

  .post('/:toolType/test-query', async ({ params, body, set }) => {
    const toolType = params.toolType

    if (!isValidToolType(toolType)) {
      set.status = 400
      return { error: `Invalid tool type: ${toolType}` }
    }

    return toolConfigService.testQuery(toolType, body.query)
  }, {
    params: t.Object({ toolType: t.String() }),
    body: t.Object({ query: t.String({ minLength: 1 }) }),
    detail: { tags: ['Tool Configs'], summary: 'Test a query with the configured tool' },
  })
