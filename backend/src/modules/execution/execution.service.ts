import { nanoid } from 'nanoid'
import { executionRepository } from './execution.repository'
import { analysisRepository } from '../analysis/analysis.repository'
import { promptService } from '../prompt/prompt.service'
import { apiKeyService } from '../api-key/apikey.service'
import { getClient, inferVendor } from '../../clients'
import { getModelPricing } from '../../config/model-pricing'
import { DEFAULTS, ID_PREFIXES, ERROR_TYPES } from '../../shared/constants'
import type { ExecutionLog, ExecuteAnalysisDto, TestPromptDto, AnalysisStats, GlobalStats, Vendor, VersionCostStats, ErrorType } from '../../shared/types'

type ExecuteWithAuthResult = {
  success: true
  log: ExecutionLog
} | {
  success: false
  error: string
  statusCode: number
}

function extractJson(content: string): Record<string, unknown> | null {
  const parseAttempts = [
    () => JSON.parse(content),
    () => {
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      return codeBlockMatch ? JSON.parse(codeBlockMatch[1].trim()) : null
    },
    () => {
      const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      return jsonMatch ? JSON.parse(jsonMatch[1]) : null
    },
  ]

  for (const attempt of parseAttempts) {
    try {
      const result = attempt()
      if (result !== null) return result
    } catch {
      continue
    }
  }

  return null
}

export const executionService = {
  async executeWithAuth(
    analysisId: string,
    dto: ExecuteAnalysisDto,
    apiKey: string | null,
    callerService?: string
  ): Promise<ExecuteWithAuthResult> {
    if (!apiKey) {
      await this.logFailure(
        analysisId,
        'Missing API key. Include X-API-Key header.',
        dto.input || {},
        0,
        ERROR_TYPES.AUTH,
        callerService
      )
      return {
        success: false,
        error: 'Missing API key. Include X-API-Key header.',
        statusCode: 401,
      }
    }

    const validation = await apiKeyService.validate(apiKey, analysisId)
    if (!validation.valid) {
      await this.logFailure(
        analysisId,
        'Invalid API key or key does not have access to this app.',
        dto.input || {},
        0,
        ERROR_TYPES.AUTH,
        callerService
      )
      return {
        success: false,
        error: 'Invalid API key or key does not have access to this app.',
        statusCode: 403,
      }
    }

    try {
      const log = await this.execute(analysisId, dto, callerService)
      return { success: true, log }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute app',
        statusCode: 400,
      }
    }
  },

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

  async testDirect(dto: TestPromptDto, analysisId?: string, versionId?: string): Promise<{
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
        model: dto.model || DEFAULTS.MODEL,
        temperature: dto.temperature ?? DEFAULTS.TEMPERATURE,
        maxTokens: dto.maxTokens || DEFAULTS.MAX_TOKENS,
        responseFormat: dto.responseFormat || DEFAULTS.RESPONSE_FORMAT,
      })

      const latencyMs = Math.round(performance.now() - startTime)
      let output: Record<string, unknown> | null = null

      if (dto.responseFormat === 'json' || !dto.responseFormat) {
        output = extractJson(response.content)
      }

      if (analysisId) {
        await this.log({
          analysisId,
          versionId: versionId || null,
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
        await this.logFailure(analysisId, errorMessage, dto.input, latencyMs, ERROR_TYPES.TEST, versionId)
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
    const id = `${ID_PREFIXES.EXECUTION}${nanoid(10)}`
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
    errorType: ErrorType = ERROR_TYPES.EXECUTION,
    versionId?: string,
    callerService?: string
  ): Promise<void> {
    await this.log({
      analysisId,
      versionId: versionId || null,
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
    const id = `${ID_PREFIXES.EXECUTION}${nanoid(10)}`
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

  async getLogs(analysisId: string, limit = DEFAULTS.QUERY_LIMIT, offset = DEFAULTS.QUERY_OFFSET): Promise<{ logs: ExecutionLog[]; total: number }> {
    return executionRepository.findByAnalysisId(analysisId, limit, offset)
  },

  async getLogById(executionId: string): Promise<ExecutionLog | null> {
    return executionRepository.findById(executionId)
  },

  async getRecentLogs(limit = DEFAULTS.QUERY_LIMIT): Promise<ExecutionLog[]> {
    return executionRepository.findRecent(limit)
  },

  async getStats(analysisId: string, versionId?: string): Promise<AnalysisStats> {
    return executionRepository.getStatsForAnalysis(analysisId, versionId)
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

  async getCostStatsByVersion(analysisId: string): Promise<VersionCostStats[]> {
    const rawStats = await executionRepository.getCostStatsByVersion(analysisId)
    const versions = await promptService.getAll(analysisId)

    return rawStats
      .filter(stat => stat.versionId !== null)
      .map(stat => {
        const version = versions.find(v => v.id === stat.versionId)
        const pricing = getModelPricing(version?.model || '')
        
        const totalInputCost = (stat.totalPromptTokens / 1_000_000) * pricing.inputPricePerMillion
        const totalOutputCost = (stat.totalCompletionTokens / 1_000_000) * pricing.outputPricePerMillion
        const totalCost = totalInputCost + totalOutputCost
        const totalTokens = stat.totalPromptTokens + stat.totalCompletionTokens

        return {
          versionId: stat.versionId!,
          version: version?.version || 0,
          model: version?.model || 'unknown',
          vendor: version?.vendor || 'openai',
          totalPromptTokens: stat.totalPromptTokens,
          totalCompletionTokens: stat.totalCompletionTokens,
          totalTokens,
          totalInputCost,
          totalOutputCost,
          totalCost,
          avgCostPerExecution: stat.executionCount > 0 ? totalCost / stat.executionCount : 0,
          avgTokensPerExecution: stat.executionCount > 0 ? totalTokens / stat.executionCount : 0,
          executionCount: stat.executionCount,
          successRate: stat.executionCount > 0 ? (stat.successCount / stat.executionCount) * 100 : 0,
        }
      })
      .sort((a, b) => b.version - a.version)
  },
}
