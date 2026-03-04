export const MODEL_CONFIG = {
  provider: process.env.MODEL_PROVIDER ?? process.env.NEXT_PUBLIC_MODEL_PROVIDER ?? "openai-compatible",
  baseUrl: process.env.MODEL_BASE_URL ?? process.env.NEXT_PUBLIC_MODEL_BASE_URL ?? "",
  apiPath: process.env.MODEL_API_PATH ?? process.env.NEXT_PUBLIC_MODEL_API_PATH ?? "/v1/chat/completions",
  modelName: process.env.MODEL_NAME ?? process.env.NEXT_PUBLIC_MODEL_NAME ?? "",
  timeoutMs: Number(process.env.MODEL_TIMEOUT_MS ?? process.env.NEXT_PUBLIC_MODEL_TIMEOUT_MS ?? 30000),
  maxTokensBasic: Number(process.env.MODEL_MAX_TOKENS_BASIC ?? 1100),
  maxTokensAdvanced: Number(process.env.MODEL_MAX_TOKENS_ADVANCED ?? 1700),
  retryCount: Number(process.env.MODEL_RETRY_COUNT ?? 1),
  retryBackoffMs: Number(process.env.MODEL_RETRY_BACKOFF_MS ?? 800),
  forceJsonMode: process.env.MODEL_FORCE_JSON_MODE !== "false",
  disableThinking: process.env.MODEL_DISABLE_THINKING !== "false"
} as const;

export const MODEL_REQUIRED_FIELDS = [
  "MODEL_BASE_URL",
  "MODEL_API_KEY",
  "MODEL_NAME",
  "MODEL_API_PATH"
] as const;
