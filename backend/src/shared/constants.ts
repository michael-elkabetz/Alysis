export const DEFAULTS = {
  QUERY_LIMIT: 50 as number,
  QUERY_OFFSET: 0 as number,
  MAX_TOKENS: 4096 as number,
  TEMPERATURE: 0.7 as number,
  MODEL: 'gpt-4o',
  RESPONSE_FORMAT: 'json' as const,
}

export const LIMITS = {
  MAX_TOKENS_CEILING: 128000,
  TEMPERATURE_MIN: 0,
  TEMPERATURE_MAX: 2,
  QUERY_LIMIT_MAX: 100,
  NAME_MIN_LENGTH: 1,
} as const

export const ID_PREFIXES = {
  PROMPT_VERSION: 'pv-',
  EXECUTION: 'exec-',
  API_KEY: 'ak-',
} as const

export const ERROR_TYPES = {
  AUTH: 'auth_error',
  API: 'api_error',
  TEST: 'test_error',
  EXECUTION: 'execution_error',
} as const

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES]
