import { pgTable, text, timestamp, integer, real, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const analysisStatusEnum = pgEnum('analysis_status', ['draft', 'active', 'deprecated']);
export const executionStatusEnum = pgEnum('execution_status', ['success', 'error']);
export const responseFormatEnum = pgEnum('response_format', ['json', 'text']);
export const providerEnum = pgEnum('provider', ['openai', 'anthropic', 'gemini']);

export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  status: analysisStatusEnum('status').notNull().default('draft'),
  activeVersionId: text('active_version_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const promptVersions = pgTable('prompt_versions', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id').notNull().references(() => analyses.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  systemPrompt: text('system_prompt').notNull(),
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
