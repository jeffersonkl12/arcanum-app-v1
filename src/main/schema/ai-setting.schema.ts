import { AI_MODEL_CATALOG, AI_PROVIDERS, isAiModelOf } from '@constant'
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

/** The setting as the renderer sees it. */
export interface AiSettingView extends AiSetting {
  apiKey: ApiKeyStatus
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
 * not a way to clear it; use `aiSetting:clearApiKey`).
 */
export const updateAiSettingSchema = z
  .object({
    provider: z.enum(AI_PROVIDERS),
    model: z.string().trim().min(1),
    temperature: z.number().min(0),
    apiKey: apiKeySchema.optional()
  })
  .superRefine(checkAiSetting)

export type UpdateAiSetting = z.infer<typeof updateAiSettingSchema>
