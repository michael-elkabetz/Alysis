import { nanoid } from 'nanoid'
import { executionRepository } from './execution.repository'
import { appRepository } from '../app/app.repository'
import { promptService } from '../prompt/prompt.service'
import { toolConfigService } from '../tool-config/tool-config.service'
import { appToolUsageService } from '../app-tool-usage/app-tool-usage.service'
import { getClient, inferVendor } from '../../clients'
import { getModelPricing } from '../../config/model-pricing'
import { DEFAULTS, ID_PREFIXES, ERROR_TYPES } from '../../shared/constants'
import type { ExecutionLog, ExecuteAnalysisDto, TestPromptDto, AnalysisStats, GlobalStats, Vendor, VersionCostStats, ErrorType, AppToolUsage } from '../../shared/types'

type ExecuteResult = {
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

async function fetchToolData(
  appId: string,
  toolUsage: AppToolUsage | null | undefined,
): Promise<Record<string, unknown> | null> {
  const toolData: Record<string, unknown> = {}

  if (toolUsage?.snowflake?.enabled && toolUsage.snowflake.query) {
    try {
      const result = await toolConfigService.executeQuery(
        'snowflake',
        toolUsage.snowflake.query,
      )
      toolData._snowflakeData = result.rows
      toolData._snowflakeRowCount = result.rowCount
    } catch (error) {
    }
  }

  if (toolUsage?.postgres?.enabled && toolUsage.postgres.query) {
    try {
      const result = await toolConfigService.executeQuery(
        'postgres',
        toolUsage.postgres.query,
      )
      toolData._postgresData = result.rows
      toolData._postgresRowCount = result.rowCount
    } catch (error) {
    }
  }

  try {
    const appToolResults = await appToolUsageService.executeAllForApp(appId)
    if (appToolResults) {
      Object.assign(toolData, appToolResults)
    }
  } catch (error) {
  }

  return Object.keys(toolData).length > 0 ? toolData : null
}

export const executionService = {
  async executeRequest(
    analysisId: string,
    dto: ExecuteAnalysisDto,
    callerService?: string
  ): Promise<ExecuteResult> {
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
    const app = await appRepository.findById(analysisId)
    if (!app) {
      throw new Error(`App not found: ${analysisId}`)
    }
    if (app.status !== 'active') {
      throw new Error(`App is not active: ${analysisId}`)
    }

    const promptVersion = await promptService.getActive(analysisId)
    if (!promptVersion) {
      throw new Error(`No active prompt version for app: ${analysisId}`)
    }

    const toolData = await fetchToolData(app.id, app.toolUsage)
    const safeInput = dto.input && typeof dto.input === 'object' ? dto.input : {}

    const enrichedInput = toolData
      ? { ...safeInput, ...toolData }
      : safeInput

    return this.executeWithPrompt(analysisId, promptVersion.id, promptVersion, enrichedInput, callerService)
  },

  async testVersion(analysisId: string, promptId: string, input: Record<string, unknown>, callerService?: string): Promise<ExecutionLog> {
    const app = await appRepository.findById(analysisId)
    const promptVersion = await promptService.getById(analysisId, promptId)
    if (!promptVersion) {
      throw new Error(`Prompt version not found: ${promptId}`)
    }

    const toolData = app ? await fetchToolData(app.id, app.toolUsage) : null
    const safeInput = input && typeof input === 'object' ? input : {}
    const enrichedInput = toolData
      ? { ...safeInput, ...toolData }
      : safeInput

    return this.executeWithPrompt(analysisId, promptId, promptVersion, enrichedInput, callerService)
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

    let enrichedInput = dto.input && typeof dto.input === 'object' ? dto.input : {}
    if (analysisId) {
      try {
        const toolData = await appToolUsageService.executeAllForApp(analysisId)
        if (toolData) {
          enrichedInput = { ...enrichedInput, ...toolData }
        }
      } catch (error) {
      }
    }

    try {
      const response = await client.complete(dto.systemPrompt, JSON.stringify(enrichedInput), {
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
          input: dto.input || {},
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
        await this.logFailure(analysisId, errorMessage, dto.input || {}, latencyMs, ERROR_TYPES.TEST, versionId)
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
    await executionRepository.create({
      id,
      analysisId: params.analysisId,
      versionId: params.versionId ?? null,
      input: params.input || {},
      output: params.output ?? null,
      rawResponse: params.rawResponse ?? null,
      latencyMs: params.latencyMs,
      tokenUsage: params.tokenUsage ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      callerService: params.callerService ?? null,
    })
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
      versionId: versionId ?? null,
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
    const safeInput = input && typeof input === 'object' ? input : {}

    try {
      const response = await client.complete(promptVersion.systemPrompt, JSON.stringify(safeInput), {
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
        input: safeInput,
        output,
        rawResponse: response.content,
        latencyMs,
        tokenUsage: response.tokenUsage,
        status: 'success',
        callerService: callerService ?? null,
      })
    } catch (error) {
      const latencyMs = Math.round(performance.now() - startTime)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      return executionRepository.create({
        id,
        analysisId,
        versionId,
        input: safeInput,
        output: null,
        rawResponse: null,
        latencyMs,
        tokenUsage: null,
        status: 'error',
        errorMessage,
        callerService: callerService ?? null,
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
    const appCount = await appRepository.count()
    const execStats = await executionRepository.getGlobalStats()

    return {
      totalApps: appCount.total,
      activeApps: appCount.active,
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
