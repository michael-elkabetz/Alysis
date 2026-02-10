import { pgTable, text, timestamp, integer, real, jsonb, pgEnum, boolean } from 'drizzle-orm/pg-core';

export const analysisStatusEnum = pgEnum('analysis_status', ['draft', 'active', 'deprecated']);
export const executionStatusEnum = pgEnum('execution_status', ['success', 'error']);
export const responseFormatEnum = pgEnum('response_format', ['json', 'text']);
export const providerEnum = pgEnum('provider', ['openai', 'anthropic', 'gemini']);
export const toolTypeEnum = pgEnum('tool_type', ['snowflake', 'postgres']);

export const toolCategoryEnum = pgEnum('tool_category', ['database', 'http', 'storage', 'notification', 'custom']);
export const executorTypeEnum = pgEnum('executor_type', ['sql', 'http', 'storage', 'notification', 'webhook', 'custom']);
export const toolDirectionEnum = pgEnum('tool_direction', ['input', 'output']);
export const scheduledRunStatusEnum = pgEnum('scheduled_run_status', ['pending', 'running', 'completed', 'failed', 'skipped']);

export interface JsonSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  format?: 'password' | 'uri' | 'email' | 'textarea';
  default?: unknown;
  enum?: string[];
  minimum?: number;
  maximum?: number;
}

export interface JsonSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export type ToolCategory = 'database' | 'http' | 'storage' | 'notification' | 'custom';
export type ExecutorType = 'sql' | 'http' | 'storage' | 'notification' | 'webhook' | 'custom';
export type ToolDirection = 'input' | 'output';

export interface AppToolUsage {
  snowflake?: {
    enabled: boolean;
    query: string;
  };
  postgres?: {
    enabled: boolean;
    query: string;
  };
}

export interface SnowflakeConfig {
  account: string;
  user: string;
  warehouse: string;
  database: string;
  schema?: string;
  role: string;
  privateKey?: string;
  privateKeyPassword?: string;
  password?: string;
}

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
}

export interface HttpConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  authType?: 'none' | 'bearer' | 'basic' | 'api_key';
  authHeaderName?: string;
  authToken?: string;
  body?: string;
}

export interface HttpUsageConfig {
}

export const toolDefinitions = pgTable('tool_definitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  category: toolCategoryEnum('category').notNull(),
  executorType: executorTypeEnum('executor_type').notNull(),
  direction: toolDirectionEnum('direction').notNull().default('input'),
  configSchema: jsonb('config_schema').notNull().$type<JsonSchema>(),
  usageSchema: jsonb('usage_schema').notNull().$type<JsonSchema>(),
  builtIn: boolean('built_in').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const toolInstances = pgTable('tool_instances', {
  id: text('id').primaryKey(),
  toolDefinitionId: text('tool_definition_id').notNull().references(() => toolDefinitions.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  config: jsonb('config').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const appToolUsages = pgTable('app_tool_usages', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  toolInstanceId: text('tool_instance_id').notNull().references(() => toolInstances.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(true),
  usageConfig: jsonb('usage_config').notNull().$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  status: analysisStatusEnum('status').notNull().default('draft'),
  activeVersionId: text('active_version_id'),
  sampleData: text('sample_data'),
  toolUsage: jsonb('tool_usage').$type<AppToolUsage>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const toolConfigs = pgTable('tool_configs', {
  id: text('id').primaryKey(),
  toolType: toolTypeEnum('tool_type').notNull().unique(),
  config: jsonb('config').notNull().$type<SnowflakeConfig | PostgresConfig>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const promptVersions = pgTable('prompt_versions', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  sampleData: text('sample_data'),
  interfaces: jsonb('interfaces'),
  provider: providerEnum('provider').notNull().default('openai'),
  model: text('model').notNull().default('gpt-5.2'),
  temperature: real('temperature').notNull().default(0.7),
  maxTokens: integer('max_tokens').notNull().default(4096),
  responseFormat: responseFormatEnum('response_format').notNull().default('json'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: text('created_by').notNull().default('system'),
});

export const executionLogs = pgTable('execution_logs', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  versionId: text('version_id').references(() => promptVersions.id, { onDelete: 'cascade' }),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  rawResponse: text('raw_response'),
  latencyMs: integer('latency_ms').notNull(),
  tokenUsage: jsonb('token_usage'),
  status: executionStatusEnum('status').notNull(),
  errorMessage: text('error_message'),
  callerService: text('caller_service'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(),
  analysisId: text('analysis_id').references(() => analyses.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at'),
});

export const vendorApiKeys = pgTable('vendor_api_keys', {
  id: text('id').primaryKey(),
  provider: providerEnum('provider').notNull().unique(),
  encryptedKey: text('encrypted_key').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type AnalysisRow = typeof analyses.$inferSelect;
export type NewAnalysis = typeof analyses.$inferInsert;

export type PromptVersionRow = typeof promptVersions.$inferSelect;
export type NewPromptVersion = typeof promptVersions.$inferInsert;

export type ExecutionLogRow = typeof executionLogs.$inferSelect;
export type NewExecutionLog = typeof executionLogs.$inferInsert;

export type ApiKeyRow = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

export type VendorApiKeyRow = typeof vendorApiKeys.$inferSelect;
export type NewVendorApiKey = typeof vendorApiKeys.$inferInsert;

export type ToolConfigRow = typeof toolConfigs.$inferSelect;
export type NewToolConfig = typeof toolConfigs.$inferInsert;

export type ToolDefinitionRow = typeof toolDefinitions.$inferSelect;
export type NewToolDefinition = typeof toolDefinitions.$inferInsert;

export type ToolInstanceRow = typeof toolInstances.$inferSelect;
export type NewToolInstance = typeof toolInstances.$inferInsert;

export type AppToolUsageRow = typeof appToolUsages.$inferSelect;
export type NewAppToolUsage = typeof appToolUsages.$inferInsert;

export const appSchedules = pgTable('app_schedules', {
  id: text('id').primaryKey(),
  appId: text('app_id').notNull().unique().references(() => analyses.id, { onDelete: 'cascade' }),
  cronExpression: text('cron_expression').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  enabled: boolean('enabled').notNull().default(true),
  inputData: jsonb('input_data').$type<Record<string, unknown>>(),
  nextRunAt: timestamp('next_run_at'),
  lastRunAt: timestamp('last_run_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const scheduledRuns = pgTable('scheduled_runs', {
  id: text('id').primaryKey(),
  scheduleId: text('schedule_id').notNull().references(() => appSchedules.id, { onDelete: 'cascade' }),
  executionLogId: text('execution_log_id').references(() => executionLogs.id, { onDelete: 'set null' }),
  status: scheduledRunStatusEnum('status').notNull().default('pending'),
  scheduledFor: timestamp('scheduled_for').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type AppScheduleRow = typeof appSchedules.$inferSelect;
export type NewAppSchedule = typeof appSchedules.$inferInsert;

export type ScheduledRunRow = typeof scheduledRuns.$inferSelect;
export type NewScheduledRun = typeof scheduledRuns.$inferInsert;
