import { nanoid } from 'nanoid'
import { executionRepository, analysisRepository } from '../repositories'
import { getClient, inferVendor } from '../clients'
import { promptService } from './prompt.service'
import type { ExecutionLog, ExecuteAnalysisDto, TestPromptDto, AnalysisStats, GlobalStats, Vendor } from '../types'

function extractJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(content)
  } catch {
  }

  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
    }
  }

  const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1])
    } catch {
    }
  }

  return null
}

export const executionService = {
  async execute(analysisId: string, dto: ExecuteAnalysisDto, callerService?: string): Promise<ExecutionLog> {
    const analysis = await analysisRepository.findById(analysisId)
    if (!analysis) {
      throw new Error(`App not found: ${analysisId}`)
    }
    if (analysis.status !== 'active') {
      throw new Error(`App is not active: ${analysisId}`)
    }

    const promptVersion = await promptService.getActive(analysisId)
    if (!promptVersion) {
      throw new Error(`No active prompt version for app: ${analysisId}`)
    }

    return this.executeWithPrompt(analysisId, promptVersion.id, promptVersion, dto.input, callerService)
  },

  async testVersion(analysisId: string, promptId: string, input: Record<string, unknown>, callerService?: string): Promise<ExecutionLog> {
    const promptVersion = await promptService.getById(analysisId, promptId)
    if (!promptVersion) {
      throw new Error(`Prompt version not found: ${promptId}`)
    }
    return this.executeWithPrompt(analysisId, promptId, promptVersion, input, callerService)
  },

  async testDirect(dto: TestPromptDto, analysisId?: string): Promise<{
    output: Record<string, unknown> | null
    rawResponse: string
    latencyMs: number
    tokenUsage: { prompt: number; completion: number; total: number }
    error?: string
  }> {
    const vendorName = dto.vendor || inferVendor(dto.model)
    const client = getClient(vendorName)
    const startTime = performance.now()

    try {
      const response = await client.complete(dto.systemPrompt, JSON.stringify(dto.input), {
        model: dto.model || 'gpt-5.2',
        temperature: dto.temperature ?? 0.7,
        maxTokens: dto.maxTokens || 4096,
        responseFormat: dto.responseFormat || 'json',
      })

      const latencyMs = Math.round(performance.now() - startTime)
      let output: Record<string, unknown> | null = null

      if (dto.responseFormat === 'json' || !dto.responseFormat) {
        output = extractJson(response.content)
      }

      if (analysisId) {
        await this.log({
          analysisId,
          status: 'success',
          input: dto.input,
          output,
          rawResponse: response.content,
          latencyMs,
          tokenUsage: response.tokenUsage,
          callerService: 'test_success',
        })
      }

      return { output, rawResponse: response.content, latencyMs, tokenUsage: response.tokenUsage }
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (analysisId) {
        await this.logFailure(analysisId, errorMessage, dto.input, latencyMs, 'test_error')
      }

      return {
        output: null,
        rawResponse: '',
        latencyMs,
        tokenUsage: { prompt: 0, completion: 0, total: 0 },
        error: errorMessage,
      }
    }
  },

  async log(params: {
    analysisId: string
    versionId?: string | null
    status: 'success' | 'error'
    input: Record<string, unknown> | null
    output?: Record<string, unknown> | null
    rawResponse?: string | null
    latencyMs: number
    tokenUsage?: { prompt: number; completion: number; total: number } | null
    errorMessage?: string | null
    callerService?: string
  }): Promise<void> {
    const id = `exec-${nanoid(10)}`
    try {
      await executionRepository.create({
        id,
        analysisId: params.analysisId,
        versionId: params.versionId || null,
        input: params.input || {},
        output: params.output || null,
        rawResponse: params.rawResponse || null,
        latencyMs: params.latencyMs,
        tokenUsage: params.tokenUsage || null,
        status: params.status,
        errorMessage: params.errorMessage || null,
        callerService: params.callerService || null,
      })
    } catch {
    }
  },

  async logFailure(
    analysisId: string,
    errorMessage: string,
    input: Record<string, unknown> | null = null,
    latencyMs: number = 0,
    errorType: 'auth_error' | 'api_error' | 'test_error' | 'execution_error' = 'execution_error',
    callerService?: string
  ): Promise<void> {
    await this.log({
      analysisId,
      status: 'error',
      input,
      latencyMs,
      errorMessage: `[${errorType}] ${errorMessage}`,
      callerService,
    })
  },

  async executeWithPrompt(
    analysisId: string,
    versionId: string,
    promptVersion: { systemPrompt: string; vendor: Vendor; model: string; temperature: number; maxTokens: number; responseFormat: 'json' | 'text' },
    input: Record<string, unknown>,
    callerService?: string
  ): Promise<ExecutionLog> {
    const id = `exec-${nanoid(10)}`
    const startTime = performance.now()
    const client = getClient(promptVersion.vendor)

    try {
      const response = await client.complete(promptVersion.systemPrompt, JSON.stringify(input), {
        model: promptVersion.model,
        temperature: promptVersion.temperature,
        maxTokens: promptVersion.maxTokens,
        responseFormat: promptVersion.responseFormat,
      })

      const latencyMs = Math.round(performance.now() - startTime)
      let output: Record<string, unknown> | null = null

      if (promptVersion.responseFormat === 'json') {
        output = extractJson(response.content)
      }

      return executionRepository.create({
        id,
        analysisId,
        versionId,
        input,
        output,
        rawResponse: response.content,
        latencyMs,
        tokenUsage: response.tokenUsage,
        status: 'success',
        callerService: callerService || null,
      })
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return executionRepository.create({
        id,
        analysisId,
        versionId,
        input,
        output: null,
        rawResponse: null,
        latencyMs,
        tokenUsage: null,
        status: 'error',
        errorMessage,
        callerService: callerService || null,
      })
    }
  },

  async getLogs(analysisId: string, limit = 50, offset = 0): Promise<{ logs: ExecutionLog[]; total: number }> {
    return executionRepository.findByAnalysisId(analysisId, limit, offset)
  },

  async getLogById(executionId: string): Promise<ExecutionLog | null> {
    return executionRepository.findById(executionId)
  },

  async getRecentLogs(limit = 50): Promise<ExecutionLog[]> {
    return executionRepository.findRecent(limit)
  },

  async getStats(analysisId: string): Promise<AnalysisStats> {
    return executionRepository.getStatsForAnalysis(analysisId)
  },

  async getGlobalStats(): Promise<GlobalStats> {
    const analysisCount = await analysisRepository.count()
    const execStats = await executionRepository.getGlobalStats()

    return {
      totalAnalyses: analysisCount.total,
      activeAnalyses: analysisCount.active,
      totalExecutions: execStats.totalExecutions,
      successRate: execStats.totalExecutions > 0 ? (execStats.successCount / execStats.totalExecutions) * 100 : 0,
      avgLatencyMs: execStats.avgLatencyMs,
      totalTokens: execStats.totalTokens,
    }
  },
}
