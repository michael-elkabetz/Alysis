import { Elysia, t } from 'elysia'
import { toolDefinitionService } from './tool-definition.service'
import type { ToolCategory, ExecutorType } from '../../db/schema'

const validCategories = ['database', 'http', 'storage', 'custom'] as const
const validExecutorTypes = ['sql', 'http', 'storage', 'custom'] as const

function isValidCategory(category: string): category is ToolCategory {
  return validCategories.includes(category as typeof validCategories[number])
}

const JsonSchemaValidator = t.Object({
  type: t.Literal('object'),
  properties: t.Record(t.String(), t.Object({
    type: t.Union([
      t.Literal('string'),
      t.Literal('number'),
      t.Literal('boolean'),
      t.Literal('object'),
      t.Literal('array'),
    ]),
    description: t.Optional(t.String()),
    format: t.Optional(t.Union([
      t.Literal('password'),
      t.Literal('uri'),
      t.Literal('email'),
      t.Literal('textarea'),
    ])),
    default: t.Optional(t.Any()),
    enum: t.Optional(t.Array(t.String())),
    minimum: t.Optional(t.Number()),
    maximum: t.Optional(t.Number()),
  })),
  required: t.Optional(t.Array(t.String())),
})

export const toolDefinitionController = new Elysia({ prefix: '/api/v1/tool-definitions' })
  .get('/', async () => {
    return toolDefinitionService.getAll()
  }, {
    detail: { tags: ['Tool Definitions'], summary: 'List all tool definitions' },
  })

  .get('/categories', async () => {
    return toolDefinitionService.getCategories()
  }, {
    detail: { tags: ['Tool Definitions'], summary: 'Get tool categories with counts' },
  })

  .get('/category/:category', async ({ params, set }) => {
    const { category } = params

    if (!isValidCategory(category)) {
      set.status = 400
      return { error: `Invalid category: ${category}. Valid categories: ${validCategories.join(', ')}` }
    }

    return toolDefinitionService.getByCategory(category)
  }, {
    params: t.Object({ category: t.String() }),
    detail: { tags: ['Tool Definitions'], summary: 'Get tool definitions by category' },
  })

  .get('/:id', async ({ params, set }) => {
    const definition = await toolDefinitionService.getById(params.id)

    if (!definition) {
      set.status = 404
      return { error: `Tool definition '${params.id}' not found` }
    }

    return definition
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Tool Definitions'], summary: 'Get tool definition by ID' },
  })

  .post('/', async ({ body, set }) => {
    try {
      if (!isValidCategory(body.category)) {
        set.status = 400
        return { error: `Invalid category: ${body.category}` }
      }

      if (!validExecutorTypes.includes(body.executorType as typeof validExecutorTypes[number])) {
        set.status = 400
        return { error: `Invalid executor type: ${body.executorType}` }
      }

      const created = await toolDefinitionService.create({
        name: body.name,
        displayName: body.displayName,
        description: body.description,
        category: body.category as ToolCategory,
        executorType: body.executorType as ExecutorType,
        configSchema: body.configSchema,
        usageSchema: body.usageSchema,
      })

      set.status = 201
      return created
    } catch (error) {
      set.status = 400
      return { error: error instanceof Error ? error.message : 'Failed to create tool definition' }
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, pattern: '^[a-z0-9_-]+$' }),
      displayName: t.String({ minLength: 1 }),
      description: t.Optional(t.String()),
      category: t.String(),
      executorType: t.String(),
      configSchema: JsonSchemaValidator,
      usageSchema: JsonSchemaValidator,
    }),
    detail: { tags: ['Tool Definitions'], summary: 'Create a new tool definition' },
  })

  .put('/:id', async ({ params, body, set }) => {
    try {
      const updated = await toolDefinitionService.update(params.id, {
        displayName: body.displayName,
        description: body.description,
        configSchema: body.configSchema,
        usageSchema: body.usageSchema,
      })

      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tool definition'
      if (message.includes('not found')) {
        set.status = 404
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      displayName: t.Optional(t.String({ minLength: 1 })),
      description: t.Optional(t.String()),
      configSchema: t.Optional(JsonSchemaValidator),
      usageSchema: t.Optional(JsonSchemaValidator),
    }),
    detail: { tags: ['Tool Definitions'], summary: 'Update a tool definition' },
  })

  .delete('/:id', async ({ params, set }) => {
    try {
      await toolDefinitionService.delete(params.id)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete tool definition'
      if (message.includes('not found')) {
        set.status = 404
      } else if (message.includes('built-in')) {
        set.status = 403
      } else {
        set.status = 400
      }
      return { error: message }
    }
  }, {
    params: t.Object({ id: t.String() }),
    detail: { tags: ['Tool Definitions'], summary: 'Delete a tool definition' },
  })
