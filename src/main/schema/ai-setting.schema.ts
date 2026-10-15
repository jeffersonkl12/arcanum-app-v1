import {
  AI_MODEL_CATALOG,
  AI_PROVIDERS,
  EMBEDDING_PROVIDERS,
  isAiModelOf,
  type EmbeddingProvider
} from '@constant'
import type { aiSettingTable } from '@database/entity/ai-setting.entity'
import { z } from 'zod'

/** The provider, model and temperature of the narrator. */
export type AiSetting = Pick<
  typeof aiSettingTable.$inferSelect,
  'provider' | 'model' | 'temperature'
>

/** What is stored: the choice plus the encrypted key, which never leaves the main process. */
export type StoredAiSetting = typeof aiSettingTable.$inferSelect

/**
 * What the renderer may know about the API key. The key itself is never sent to it: the UI shows
 * `hint` ("saved key ending in ...") and lets the player replace or remove it.
 */
export interface ApiKeyStatus {
  configured: boolean
  /** `stored` was saved in the app and wins; `environment` comes from the process environment. */
  source: 'stored' | 'environment' | 'none'
  /** Last characters of the saved key; `null` unless `source` is `stored`. */
  hint: string | null
}

/**
 * Same for the key of the memory's embeddings, which is the one of the embedding provider. Without a
 * saved one it can still work: `chat` is the key already saved for the narrator, used while the
 * narrator and the embeddings share a provider.
 */
export interface EmbeddingApiKeyStatus {
  configured: boolean
  source: 'stored' | 'chat' | 'environment' | 'none'
  hint: string | null
}

/** The setting as the renderer sees it. */
export interface AiSettingView extends AiSetting {
  /** Whose embeddings search the characters' memory. */
  embeddingProvider: EmbeddingProvider
  apiKey: ApiKeyStatus
  embeddingApiKey: EmbeddingApiKeyStatus
}

export const apiKeySchema = z.string().trim().min(1).max(512)

/** Rules that span fields, so they are checked here and reach the renderer as `invalid_input`. */
function checkAiSetting(setting: AiSetting, context: z.RefinementCtx): void {
  const provider = AI_MODEL_CATALOG[setting.provider]

  if (!isAiModelOf(setting.provider, setting.model)) {
    context.addIssue({
      code: 'custom',
      path: ['model'],
      message: `"${setting.model}" is not a ${provider.label} model of the catalog`
    })
  }

  if (setting.temperature > provider.maxTemperature) {
    context.addIssue({
      code: 'custom',
      path: ['temperature'],
      message: `${provider.label} accepts a temperature up to ${provider.maxTemperature}`
    })
  }
}

/**
 * Replaces the whole choice: changing the provider means changing the model too. `apiKey` is the
 * key of the chosen provider; omit it to keep the saved one. A saved key only follows the provider
 * it was saved for, so changing provider without sending a key drops it (a blank key is rejected,
 * not a way to clear it; use `aiSetting:clearApiKey`). `embeddingProvider` is whose embeddings
 * search the memory and `embeddingApiKey` its key: it follows the embedding provider, not the
 * narrator's, so it is kept when the narrator changes, omitting it keeps the saved one while the
 * embedding provider stays, and changing that provider without a key drops it
 * (`aiSetting:clearEmbeddingApiKey` removes it).
 */
export const updateAiSettingSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string().trim().min(1),
    temperature: z.number().min(0),
    apiKey: apiKeySchema.optional(),
    embeddingProvider: z.enum(EMBEDDING_PROVIDERS),
    embeddingApiKey: apiKeySchema.optional()
  })
  .superRefine(checkAiSetting)

export type UpdateAiSetting = z.infer<typeof updateAiSettingSchema>

/**
 * Asks whether a provider answers with a key, before the player saves anything. `provider` (and
 * `model` for the narrator) are what the form shows now, which may differ from what is saved. With
 * no `apiKey` the key that would be used in a turn is tested instead: the saved one, else the
 * environment's.
 */
export const testAiConnectionSchema = z.discriminatedUnion('target', [
  z.object({
    target: z.literal('chat'),
    provider: z.enum(AI_PROVIDERS),
    model: z.string().trim().min(1),
    apiKey: apiKeySchema.optional()
  }),
  z.object({
    target: z.literal('embedding'),
    provider: z.enum(EMBEDDING_PROVIDERS),
    apiKey: apiKeySchema.optional()
  })
])

export type TestAiConnection = z.infer<typeof testAiConnectionSchema>

/** Why a test failed, in terms the player can act on. The provider's own message stays in main. */
export const AI_CONNECTION_FAILURES = [
  'missing_key',
  'invalid_key',
  'quota',
  'model_not_found',
  'timeout',
  'network',
  'unknown'
] as const

export type AiConnectionFailure = (typeof AI_CONNECTION_FAILURES)[number]

/** A test that fails is a normal answer, not an IPC error. */
export type AiConnectionResult =
  { ok: true; latencyMs: number } | { ok: false; reason: AiConnectionFailure; latencyMs: number }
