export const AI_PROVIDERS = ['google', 'openai', 'anthropic', 'deepseek'] as const

export type AiProvider = (typeof AI_PROVIDERS)[number]

export interface AiModelOption {
  /** Model name inside its provider, exactly as the Mastra model router expects it. */
  id: string
  label: string
}

export interface AiProviderOption {
  label: string
  /** Environment variable Mastra reads the provider's key from when none is saved in the app. */
  apiKeyEnvVar: string
  /** Highest temperature the provider's API accepts (Anthropic stops at 1, the others at 2). */
  maxTemperature: number
  /** From the most capable (and most expensive) to the simplest and cheapest. */
  models: readonly AiModelOption[]
}

/**
 * Models the player can pick for the narrator. Names were checked against the Mastra provider
 * registry (`.claude/skills/mastra/scripts/provider-registry.mjs --provider <name>`), which carries
 * no prices: the order inside each provider is a judgment from the model names, so revisit it when
 * a provider ships a new generation. Adding a model here is all it takes to offer it.
 */
export const AI_MODEL_CATALOG: Readonly<Record<AiProvider, AiProviderOption>> = {
  google: {
    label: 'Google Gemini',
    apiKeyEnvVar: 'GOOGLE_API_KEY',
    maxTemperature: 2,
    models: [
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)' },
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' }
    ]
  },
  openai: {
    label: 'OpenAI',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    maxTemperature: 2,
    models: [
      { id: 'gpt-5.5-pro', label: 'GPT-5.5 Pro' },
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' }
    ]
  },
  anthropic: {
    label: 'Anthropic Claude',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    maxTemperature: 1,
    models: [
      { id: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
      { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
      { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }
    ]
  },
  deepseek: {
    label: 'DeepSeek',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    maxTemperature: 2,
    models: [
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' }
    ]
  }
}

/**
 * Model of each provider for the work the player does not pick: the NPC creator and the
 * summarization of old messages (Observational Memory). Both fill structured text from clear
 * instructions, so the cheapest tier that still follows a schema well is enough: the "mini" or
 * "lite" of each family, never the smallest ("nano") one. Each id must be in the provider's catalog.
 */
export const AI_HELPER_MODELS: Readonly<Record<AiProvider, string>> = {
  google: 'gemini-3.5-flash-lite',
  openai: 'gpt-5.4-mini',
  anthropic: 'claude-haiku-4-5',
  deepseek: 'deepseek-v4-flash'
}

/** What a world uses until the player picks something else. */
export const DEFAULT_AI_SETTING = {
  provider: 'google',
  model: 'gemini-3.5-flash',
  temperature: 1
} as const satisfies { provider: AiProvider; model: string; temperature: number }

export function isAiModelOf(provider: AiProvider, model: string): boolean {
  return AI_MODEL_CATALOG[provider].models.some((option) => option.id === model)
}

/** The id the Mastra model router takes: `provider/model`. */
export function toMastraModelId(provider: AiProvider, model: string): `${AiProvider}/${string}` {
  return `${provider}/${model}`
}
