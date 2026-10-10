import {
  AI_MODEL_CATALOG,
  AI_PROVIDERS,
  DEFAULT_AI_SETTING,
  isAiModelOf,
  type AiProvider,
  type AiProviderOption
} from '@constant'
import type { ISecretCipher } from '@lib/secret-cipher.lib'
import type { IAiSettingRepository } from '@repository/ai-setting.repository'
import type {
  AiSetting,
  AiSettingView,
  ApiKeyStatus,
  StoredAiSetting,
  UpdateAiSetting
} from '@schema/ai-setting.schema'

const HINT_LENGTH = 4

export interface AiProviderCatalogEntry extends AiProviderOption {
  id: AiProvider
  /** Whether the process environment already provides this provider's key. */
  hasEnvironmentKey: boolean
}

/** The effective setting for a turn, key included. For the main process only. */
export interface ResolvedAiSetting extends AiSetting {
  /** `undefined` when no key is saved, which leaves Mastra to read the provider's environment variable. */
  apiKey?: string
}

export interface IAiSettingService {
  /** The setting in use (the default until the player saves one), without the key itself. */
  get(): Promise<AiSettingView>
  /** Saves the choice and, when sent, the API key; both survive restarts. */
  update(input: UpdateAiSetting): Promise<AiSettingView>
  /** Forgets the saved key (the environment's, if any, is used again). */
  clearApiKey(): Promise<AiSettingView>
  /** What the player can pick, providers in a fixed order and models from the most capable down. */
  listCatalog(): AiProviderCatalogEntry[]
  /** The setting with the key decrypted. Never return this through IPC. */
  resolve(): Promise<ResolvedAiSetting>
}

/**
 * The AI setting is global: one provider, model, temperature and API key for every world. The key
 * is encrypted at rest and only ever leaves this class decrypted through `resolve`. A stored model
 * that left the catalog since falls back to the default instead of failing the player's turn.
 */
export class AiSettingService implements IAiSettingService {
  constructor(
    private readonly repository: IAiSettingRepository,
    private readonly cipher: ISecretCipher,
    private readonly environment: NodeJS.ProcessEnv = process.env
  ) {}

  async get(): Promise<AiSettingView> {
    return this.toView(await this.load())
  }

  async update({ apiKey, ...choice }: UpdateAiSetting): Promise<AiSettingView> {
    const stored = await this.repository.find()

    // A saved key belongs to the provider it was saved for; handing it to another provider would
    // leak it, so it only stays when the provider does.
    const keyToKeep = stored?.provider === choice.provider ? stored : undefined
    const key =
      apiKey === undefined
        ? { encryptedKey: keyToKeep?.encryptedKey ?? null, keyHint: keyToKeep?.keyHint ?? null }
        : { encryptedKey: this.cipher.encrypt(apiKey), keyHint: apiKey.slice(-HINT_LENGTH) }

    await this.repository.save({ ...choice, ...key })

    return this.get()
  }

  async clearApiKey(): Promise<AiSettingView> {
    const stored = await this.repository.find()

    if (stored?.encryptedKey) {
      await this.repository.save({ ...stored, encryptedKey: null, keyHint: null })
    }

    return this.get()
  }

  listCatalog(): AiProviderCatalogEntry[] {
    return AI_PROVIDERS.map((id) => ({
      id,
      ...AI_MODEL_CATALOG[id],
      hasEnvironmentKey: this.hasEnvironmentKey(id)
    }))
  }

  async resolve(): Promise<ResolvedAiSetting> {
    const stored = await this.load()
    const { provider, model, temperature } = stored

    return {
      provider,
      model,
      temperature,
      apiKey: stored.encryptedKey ? this.cipher.decrypt(stored.encryptedKey) : undefined
    }
  }

  private async load(): Promise<StoredAiSetting> {
    const stored = await this.repository.find()

    return stored && isAiModelOf(stored.provider, stored.model)
      ? stored
      : { id: true, ...DEFAULT_AI_SETTING, encryptedKey: null, keyHint: null }
  }

  private toView(stored: StoredAiSetting): AiSettingView {
    const { provider, model, temperature } = stored

    return { provider, model, temperature, apiKey: this.keyStatus(stored) }
  }

  private keyStatus(stored: StoredAiSetting): ApiKeyStatus {
    if (stored.encryptedKey) return { configured: true, source: 'stored', hint: stored.keyHint }

    return this.hasEnvironmentKey(stored.provider)
      ? { configured: true, source: 'environment', hint: null }
      : { configured: false, source: 'none', hint: null }
  }

  private hasEnvironmentKey(provider: AiProvider): boolean {
    return Boolean(this.environment[AI_MODEL_CATALOG[provider].apiKeyEnvVar])
  }
}
