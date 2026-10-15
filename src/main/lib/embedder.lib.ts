import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { AI_MODEL_CATALOG, EMBEDDING_MODELS, type EmbeddingProvider } from '@constant'
import { ConflictError } from '@error'

/** The embedding provider the player picked and the key saved for it, if any. */
export interface EmbedderSetting {
  provider: EmbeddingProvider
  apiKey?: string
}

export interface IEmbedder {
  /** Whose model embeds right now. Vectors of different providers are never comparable. */
  provider(): Promise<EmbeddingProvider>
  /** Whether it can embed right now (for a hosted model: whether a key is configured). */
  isAvailable(): Promise<boolean>
  /** One vector per value, in order. Throws `ConflictError` when it is not available. */
  embed(values: string[]): Promise<number[][]>
}

/**
 * Embeddings from the provider the player picked (OpenAI or Google), through Mastra's model router.
 * The setting is asked for on every call, because the player can change it while the app runs: the
 * key saved in the app, or else the provider's environment variable (which the router reads on its
 * own when no key is given).
 */
export class Embedder implements IEmbedder {
  constructor(
    private readonly setting: () => Promise<EmbedderSetting>,
    private readonly environment: NodeJS.ProcessEnv = process.env
  ) {}

  async provider(): Promise<EmbeddingProvider> {
    return (await this.setting()).provider
  }

  async isAvailable(): Promise<boolean> {
    const { provider, apiKey } = await this.setting()

    return Boolean(apiKey ?? this.environment[AI_MODEL_CATALOG[provider].apiKeyEnvVar])
  }

  async embed(values: string[]): Promise<number[][]> {
    const { provider, apiKey } = await this.setting()
    if (!(await this.isAvailable())) {
      throw new ConflictError(
        `Memory needs a ${AI_MODEL_CATALOG[provider].label} API key for its embeddings, and there is none`
      )
    }
    if (values.length === 0) return []

    const { id, dimensions } = EMBEDDING_MODELS[provider]
    const model = new ModelRouterEmbeddingModel({ id, apiKey })
    const { embeddings } = await model.doEmbed({
      values,
      // Only Google reads this; OpenAI's model has a single size and the key is ignored there.
      providerOptions: { google: { outputDimensionality: dimensions } }
    })

    return embeddings
  }
}
