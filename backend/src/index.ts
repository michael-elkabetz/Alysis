import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'
import './db'

import { healthController } from './modules/health/health.controller'
import { appController } from './modules/app/app.controller'
import { promptController } from './modules/prompt/prompt.controller'
import { executionController } from './modules/execution/execution.controller'
import { apiKeyController } from './modules/api-key/api-key.controller'
import { apiKeyService } from './modules/api-key/api-key.service'
import { vendorKeyController } from './modules/vendor-key/vendor-key.controller'
import { toolConfigController } from './modules/tool-config/tool-config.controller'
import { toolDefinitionController } from './modules/tool-definition/tool-definition.controller'
import { toolDefinitionService } from './modules/tool-definition/tool-definition.service'
import { toolInstanceController } from './modules/tool-instance/tool-instance.controller'
import { appToolUsageController } from './modules/app-tool-usage/app-tool-usage.controller'
import { devToolsController } from './modules/dev-tools/dev-tools.controller'
import { clientController } from './clients/client.controller'
import { scheduleController, startScheduleProcessor } from './modules/schedule'

const PORT = process.env.PORT ?? 3001

if (process.env.DATABASE_URL) {
  try {
    const client = postgres(process.env.DATABASE_URL, { max: 1 })
    
    const checkResult = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'analyses'
      )
    `
    const isInitialized = checkResult[0]?.exists ?? false
    
    if (!isInitialized) {
      const initSqlPath = join(process.cwd(), 'src', 'db', 'init.sql')
      const initSql = readFileSync(initSqlPath, 'utf-8')
      
      await client.unsafe(initSql)
    }

    // Ensure tool_direction enum and direction column exist
    const directionEnumExists = await client`
      SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tool_direction')
    `
    if (!directionEnumExists[0]?.exists) {
      await client`
        DO $$ BEGIN
          CREATE TYPE tool_direction AS ENUM ('input', 'output');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$
      `
    }

    // Add notification to tool_category enum if not exists
    const categoryNotificationExists = await client`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'tool_category'::regtype 
        AND enumlabel = 'notification'
      )
    `
    if (!categoryNotificationExists[0]?.exists) {
      await client`ALTER TYPE tool_category ADD VALUE 'notification'`
    }

    // Add notification to executor_type enum if not exists
    const executorNotificationExists = await client`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'executor_type'::regtype 
        AND enumlabel = 'notification'
      )
    `
    if (!executorNotificationExists[0]?.exists) {
      await client`ALTER TYPE executor_type ADD VALUE 'notification'`
    }

    // Add webhook to executor_type enum if not exists
    const executorWebhookExists = await client`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'executor_type'::regtype 
        AND enumlabel = 'webhook'
      )
    `
    if (!executorWebhookExists[0]?.exists) {
      await client`ALTER TYPE executor_type ADD VALUE 'webhook'`
    }

    // Add direction column to tool_definitions if not exists
    const directionColumnExists = await client`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tool_definitions' 
        AND column_name = 'direction'
      )
    `
    if (!directionColumnExists[0]?.exists) {
      await client`
        ALTER TABLE tool_definitions 
        ADD COLUMN direction tool_direction NOT NULL DEFAULT 'input'
      `
    }
    
    await client.end()
  } catch {
    // Database initialization failed - server will continue but DB operations may fail
  }
}

await apiKeyService.initialize()
await toolDefinitionService.initialize()
startScheduleProcessor()

const app = new Elysia()
  .use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Caller-Service'],
  }))
  .use(swagger({
    documentation: {
      info: {
        title: 'Alysis API',
        version: '1.0.0',
        description: 'AI Analysis Platform API',
      },
      tags: [
        { name: 'Health', description: 'Health check endpoint' },
        { name: 'Apps', description: 'App management' },
        { name: 'Prompts', description: 'Prompt version management' },
        { name: 'Execution', description: 'App execution' },
        { name: 'Clients', description: 'AI client information' },
        { name: 'API Keys', description: 'API key management' },
        { name: 'Vendor Keys', description: 'Vendor API key management' },
        { name: 'Tool Configs', description: 'Tool configuration management (Snowflake, etc.)' },
        { name: 'Tool Definitions', description: 'Tool definition catalog management' },
        { name: 'Tool Instances', description: 'Tool instance connection management' },
        { name: 'App Tool Usage', description: 'Per-app tool configuration' },
        { name: 'DevTools', description: 'Developer tools' },
        { name: 'Schedules', description: 'App scheduling and automated runs' },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
      },
      security: [{ apiKey: [] }],
    },
    path: '/docs',
    exclude: ['/docs', '/docs/*', '/api/health'],
  }))
  .use(staticPlugin({
    assets: 'public',
    prefix: '/',
    indexHTML: true,
  }))
  .use(healthController)
  .use(clientController)
  .use(appController)
  .use(promptController)
  .use(executionController)
  .use(apiKeyController)
  .use(vendorKeyController)
  .use(toolConfigController)
  .use(toolDefinitionController)
  .use(toolInstanceController)
  .use(appToolUsageController)
  .use(devToolsController)
  .use(scheduleController)
  .listen(PORT)

export type App = typeof app
