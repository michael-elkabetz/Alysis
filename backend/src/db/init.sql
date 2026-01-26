-- Alysis Database Schema
-- SINGLE SQL FILE - Complete database setup
-- This is the only SQL file needed to set up the database
-- Run this file to create/reset the database from scratch
-- After initial setup, you can remove the DROP section below if desired

-- ============================================================================
-- DROP SECTION - Remove this section after database recreation
-- ============================================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "scheduled_runs" CASCADE;
DROP TABLE IF EXISTS "app_schedules" CASCADE;
DROP TABLE IF EXISTS "app_tool_usages" CASCADE;
DROP TABLE IF EXISTS "tool_instances" CASCADE;
DROP TABLE IF EXISTS "tool_definitions" CASCADE;
DROP TABLE IF EXISTS "execution_logs" CASCADE;
DROP TABLE IF EXISTS "prompt_versions" CASCADE;
DROP TABLE IF EXISTS "api_keys" CASCADE;
DROP TABLE IF EXISTS "vendor_api_keys" CASCADE;
DROP TABLE IF EXISTS "tool_configs" CASCADE;
DROP TABLE IF EXISTS "analyses" CASCADE;

-- Drop custom types and enums
DROP TYPE IF EXISTS "scheduled_run_status" CASCADE;
DROP TYPE IF EXISTS "tool_category" CASCADE;
DROP TYPE IF EXISTS "executor_type" CASCADE;
DROP TYPE IF EXISTS "analysis_status" CASCADE;
DROP TYPE IF EXISTS "execution_status" CASCADE;
DROP TYPE IF EXISTS "response_format" CASCADE;
DROP TYPE IF EXISTS "provider" CASCADE;
DROP TYPE IF EXISTS "tool_type" CASCADE;

-- ============================================================================
-- CREATE SECTION - Complete schema definition
-- ============================================================================

-- Create Enums
CREATE TYPE "public"."analysis_status" AS ENUM('draft', 'active', 'deprecated');
CREATE TYPE "public"."execution_status" AS ENUM('success', 'error');
CREATE TYPE "public"."provider" AS ENUM('openai', 'anthropic', 'gemini');
CREATE TYPE "public"."response_format" AS ENUM('json', 'text');
CREATE TYPE "public"."tool_type" AS ENUM('snowflake', 'postgres');
CREATE TYPE "public"."tool_category" AS ENUM('database', 'http', 'storage', 'notification', 'custom');
CREATE TYPE "public"."executor_type" AS ENUM('sql', 'http', 'storage', 'notification', 'webhook', 'custom');
CREATE TYPE "public"."scheduled_run_status" AS ENUM('pending', 'running', 'completed', 'failed', 'skipped');

-- Analyses Table
CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "analysis_status" DEFAULT 'draft' NOT NULL,
	"active_version_id" text,
	"sample_data" text,
	"tool_usage" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "analyses_name_unique" UNIQUE("name")
);

-- Prompt Versions Table
CREATE TABLE "prompt_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"version" integer NOT NULL,
	"system_prompt" text NOT NULL,
	"interfaces" jsonb,
	"provider" "provider" DEFAULT 'openai' NOT NULL,
	"model" text DEFAULT 'gpt-5.2' NOT NULL,
	"temperature" real DEFAULT 0.7 NOT NULL,
	"max_tokens" integer DEFAULT 4096 NOT NULL,
	"response_format" "response_format" DEFAULT 'json' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL
);

-- Execution Logs Table
CREATE TABLE "execution_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"analysis_id" text NOT NULL,
	"version_id" text,
	"input" jsonb NOT NULL,
	"output" jsonb,
	"raw_response" text,
	"latency_ms" integer NOT NULL,
	"token_usage" jsonb,
	"status" "execution_status" NOT NULL,
	"error_message" text,
	"caller_service" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- API Keys Table
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"analysis_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);

-- Vendor API Keys Table
CREATE TABLE "vendor_api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" "provider" NOT NULL,
	"encrypted_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_api_keys_provider_unique" UNIQUE("provider")
);

-- Tool Configs Table
CREATE TABLE "tool_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"tool_type" "tool_type" NOT NULL UNIQUE,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Tool Definitions Table
CREATE TABLE "tool_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL UNIQUE,
	"display_name" text NOT NULL,
	"description" text,
	"category" "tool_category" NOT NULL,
	"executor_type" "executor_type" NOT NULL,
	"config_schema" jsonb NOT NULL,
	"usage_schema" jsonb NOT NULL,
	"built_in" boolean NOT NULL DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Tool Instances Table
CREATE TABLE "tool_instances" (
	"id" text PRIMARY KEY NOT NULL,
	"tool_definition_id" text NOT NULL,
	"name" text NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- App Tool Usages Table
CREATE TABLE "app_tool_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"tool_instance_id" text NOT NULL,
	"enabled" boolean NOT NULL DEFAULT true,
	"usage_config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign Key Constraints
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_version_id_prompt_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."prompt_versions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tool_instances" ADD CONSTRAINT "tool_instances_tool_definition_id_tool_definitions_id_fk" FOREIGN KEY ("tool_definition_id") REFERENCES "public"."tool_definitions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "app_tool_usages" ADD CONSTRAINT "app_tool_usages_app_id_analyses_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "app_tool_usages" ADD CONSTRAINT "app_tool_usages_tool_instance_id_tool_instances_id_fk" FOREIGN KEY ("tool_instance_id") REFERENCES "public"."tool_instances"("id") ON DELETE cascade ON UPDATE no action;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_tool_instances_definition" ON "tool_instances"("tool_definition_id");
CREATE INDEX IF NOT EXISTS "idx_app_tool_usages_app" ON "app_tool_usages"("app_id");
CREATE INDEX IF NOT EXISTS "idx_app_tool_usages_instance" ON "app_tool_usages"("tool_instance_id");
CREATE INDEX IF NOT EXISTS "idx_tool_definitions_category" ON "tool_definitions"("category");
CREATE INDEX IF NOT EXISTS "idx_tool_configs_tool_type" ON "tool_configs"("tool_type");

-- App Schedules Table - One schedule per app for automated execution
CREATE TABLE "app_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL UNIQUE,
	"cron_expression" text NOT NULL,
	"timezone" text NOT NULL DEFAULT 'UTC',
	"enabled" boolean NOT NULL DEFAULT true,
	"input_data" jsonb,
	"next_run_at" timestamp,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Scheduled Runs Table - Tracks scheduled execution history (job queue)
CREATE TABLE "scheduled_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"execution_log_id" text,
	"status" "scheduled_run_status" NOT NULL DEFAULT 'pending',
	"scheduled_for" timestamp NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign Key Constraints for Schedules
ALTER TABLE "app_schedules" ADD CONSTRAINT "app_schedules_app_id_analyses_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scheduled_runs" ADD CONSTRAINT "scheduled_runs_schedule_id_app_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."app_schedules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scheduled_runs" ADD CONSTRAINT "scheduled_runs_execution_log_id_execution_logs_id_fk" FOREIGN KEY ("execution_log_id") REFERENCES "public"."execution_logs"("id") ON DELETE set null ON UPDATE no action;

-- Indexes for Schedules
CREATE INDEX IF NOT EXISTS "idx_app_schedules_app_id" ON "app_schedules"("app_id");
CREATE INDEX IF NOT EXISTS "idx_app_schedules_enabled_next_run" ON "app_schedules"("enabled", "next_run_at") WHERE "enabled" = true;
CREATE INDEX IF NOT EXISTS "idx_scheduled_runs_schedule_id" ON "scheduled_runs"("schedule_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_runs_status_scheduled" ON "scheduled_runs"("status", "scheduled_for") WHERE "status" = 'pending';
CREATE INDEX IF NOT EXISTS "idx_scheduled_runs_created_at" ON "scheduled_runs"("created_at" DESC);

-- ============================================================================
-- SEED DATA - Built-in Tool Definitions
-- ============================================================================

-- Snowflake Tool Definition
INSERT INTO "tool_definitions" ("id", "name", "display_name", "description", "category", "executor_type", "config_schema", "usage_schema", "built_in", "created_at", "updated_at")
VALUES (
    'td-snowflake',
    'snowflake',
    'Snowflake',
    'Cloud data warehouse for analytics and data storage',
    'database',
    'sql',
    '{
        "type": "object",
        "properties": {
            "account": {"type": "string", "description": "Snowflake account identifier (e.g., abc12345.us-east-1)"},
            "user": {"type": "string", "description": "Username for authentication"},
            "warehouse": {"type": "string", "description": "Compute warehouse name"},
            "database": {"type": "string", "description": "Default database name"},
            "schema": {"type": "string", "description": "Default schema name"},
            "role": {"type": "string", "description": "User role for access control"},
            "password": {"type": "string", "format": "password", "description": "Password for authentication"},
            "privateKey": {"type": "string", "format": "textarea", "description": "Private key for key-pair authentication (PEM format)"},
            "privateKeyPassword": {"type": "string", "format": "password", "description": "Passphrase for encrypted private key"}
        },
        "required": ["account", "user", "warehouse", "database", "role"]
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "query": {"type": "string", "format": "textarea", "description": "SQL query to execute"}
        },
        "required": ["query"]
    }'::jsonb,
    true,
    NOW(),
    NOW()
) ON CONFLICT ("id") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "config_schema" = EXCLUDED."config_schema",
    "usage_schema" = EXCLUDED."usage_schema",
    "updated_at" = NOW();

-- PostgreSQL Tool Definition
INSERT INTO "tool_definitions" ("id", "name", "display_name", "description", "category", "executor_type", "config_schema", "usage_schema", "built_in", "created_at", "updated_at")
VALUES (
    'td-postgres',
    'postgres',
    'PostgreSQL',
    'Open-source relational database system',
    'database',
    'sql',
    '{
        "type": "object",
        "properties": {
            "host": {"type": "string", "description": "Database server hostname"},
            "port": {"type": "number", "description": "Database server port", "default": 5432},
            "database": {"type": "string", "description": "Database name"},
            "user": {"type": "string", "description": "Username for authentication"},
            "password": {"type": "string", "format": "password", "description": "Password for authentication"}
        },
        "required": ["host", "database", "user"]
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "query": {"type": "string", "format": "textarea", "description": "SQL query to execute"}
        },
        "required": ["query"]
    }'::jsonb,
    true,
    NOW(),
    NOW()
) ON CONFLICT ("id") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "config_schema" = EXCLUDED."config_schema",
    "usage_schema" = EXCLUDED."usage_schema",
    "updated_at" = NOW();

-- MySQL Tool Definition
INSERT INTO "tool_definitions" ("id", "name", "display_name", "description", "category", "executor_type", "config_schema", "usage_schema", "built_in", "created_at", "updated_at")
VALUES (
    'td-mysql',
    'mysql',
    'MySQL',
    'Popular open-source relational database',
    'database',
    'sql',
    '{
        "type": "object",
        "properties": {
            "host": {"type": "string", "description": "Database server hostname"},
            "port": {"type": "number", "description": "Database server port", "default": 3306},
            "database": {"type": "string", "description": "Database name"},
            "user": {"type": "string", "description": "Username for authentication"},
            "password": {"type": "string", "format": "password", "description": "Password for authentication"},
            "ssl": {"type": "boolean", "description": "Enable SSL connection", "default": false}
        },
        "required": ["host", "database", "user"]
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "query": {"type": "string", "format": "textarea", "description": "SQL query to execute"}
        },
        "required": ["query"]
    }'::jsonb,
    true,
    NOW(),
    NOW()
) ON CONFLICT ("id") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "config_schema" = EXCLUDED."config_schema",
    "usage_schema" = EXCLUDED."usage_schema",
    "updated_at" = NOW();

-- HTTP Request Tool Definition
INSERT INTO "tool_definitions" ("id", "name", "display_name", "description", "category", "executor_type", "config_schema", "usage_schema", "built_in", "created_at", "updated_at")
VALUES (
    'td-http',
    'http',
    'HTTP Request',
    'Make HTTP/REST API calls to external services',
    'http',
    'http',
    '{
        "type": "object",
        "properties": {
            "baseUrl": {"type": "string", "format": "uri", "description": "Base URL (e.g. https://api.stripe.com/v1)"},
            "authType": {"type": "string", "enum": ["Bearer", "Basic", "None"], "description": "Authentication Type", "default": "Bearer"},
            "authToken": {"type": "string", "format": "password", "description": "Token / API Key / Password"}
        },
        "required": []
    }'::jsonb,
    '{
        "type": "object",
        "properties": {
            "method": {"type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"], "description": "HTTP method", "default": "GET"},
            "endpoint": {"type": "string", "description": "URL Path (e.g. /users)"},
            "body": {"type": "string", "format": "textarea", "description": "Request body (optional)"}
        },
        "required": ["method", "endpoint"]
    }'::jsonb,
    true,
    NOW(),
    NOW()
) ON CONFLICT ("id") DO UPDATE SET
    "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description",
    "config_schema" = EXCLUDED."config_schema",
    "usage_schema" = EXCLUDED."usage_schema",
    "updated_at" = NOW();
