import { Elysia } from 'elysia'

export const healthController = new Elysia({ prefix: '/api' })
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    runtime: 'bun',
    version: Bun.version,
  }), {
    detail: { tags: ['Health'], summary: 'Health check' },
  })
