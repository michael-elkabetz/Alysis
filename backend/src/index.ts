import { Elysia } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'
import { staticPlugin } from '@elysiajs/static'

import {
  healthController,
  analysisController,
  promptController,
  executionController,
  apiKeyController,
  vendorKeyController,
  clientController,
} from './controllers'

const PORT = process.env.PORT ?? 3001

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
    noCache: process.env.NODE_ENV !== 'production',
  }))
  .use(healthController)
  .use(clientController)
  .use(analysisController)
  .use(promptController)
  .use(executionController)
  .use(apiKeyController)
  .use(vendorKeyController)
  .listen(PORT)

export type App = typeof app
