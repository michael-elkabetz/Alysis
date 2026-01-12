import { Elysia, t } from 'elysia'
import { devToolsService } from './dev-tools.service'

export const devToolsController = new Elysia({ prefix: '/api/v1/dev-tools' })
  .post('/generate-interface', async ({ body, set }) => {
    try {
      const code = await devToolsService.generateTyphoeusInterface(
        body.analysisName,
        body.jsonOutput
      )
      return { code }
    } catch (error) {
      set.status = 500
      return { error: error instanceof Error ? error.message : 'Failed to generate interface' }
    }
  }, {
    body: t.Object({
      analysisName: t.String(),
      jsonOutput: t.Record(t.String(), t.Unknown())
    }),
    detail: { tags: ['DevTools'], summary: 'Generate Typhoeus interface' }
  })
