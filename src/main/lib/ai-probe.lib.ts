import { ModelRouterEmbeddingModel, ModelRouterLanguageModel } from '@mastra/core/llm'
import {
  EMBEDDING_MODELS,
  toMastraModelId,
  type AiProvider,
  type EmbeddingProvider
} from '@constant'

/** Longest a test may take before it counts as a failure. */
const PROBE_TIMEOUT_MS = 30_000

/** Why a probe failed, before the service turns it into something to show the player. */
export type ProbeFailure =
  'invalid_key' | 'quota' | 'model_not_found' | 'timeout' | 'network' | 'unknown'

export interface IAiProbe {
  /** Sends the smallest possible prompt to the model. Resolves on success, throws `ProbeError`. */
  pingChat(provider: AiProvider, model: string, apiKey?: string): Promise<void>
  /** Embeds one short text with the provider's embedding model. Throws `ProbeError`. */
  pingEmbedding(provider: EmbeddingProvider, apiKey?: string): Promise<void>
}

export class ProbeError extends Error {
  constructor(
    readonly failure: ProbeFailure,
    options?: ErrorOptions
  ) {
    super(failure, options)
    this.name = 'ProbeError'
  }
}

/**
 * Real calls through Mastra's model router, the same path a turn takes, so a pass means the key,
 * the model and the quota work. `apiKey` undefined leaves the router to read the environment.
 */
export class AiProbe implements IAiProbe {
  async pingChat(provider: AiProvider, model: string, apiKey?: string): Promise<void> {
    const languageModel = new ModelRouterLanguageModel({
      id: toMastraModelId(provider, model),
      apiKey
    })

    await this.guarded(() =>
      languageModel.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Reply with: ok' }] }],
        // Reasoning models spend part of this before answering; any 2xx already proves the key.
        maxOutputTokens: 64,
        // DeepSeek V4 thinks by default, which can outlast the timeout; the ping needs no reasoning.
        providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
        abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS)
      })
    )
  }

  async pingEmbedding(provider: EmbeddingProvider, apiKey?: string): Promise<void> {
    const { id, dimensions } = EMBEDDING_MODELS[provider]
    const embeddingModel = new ModelRouterEmbeddingModel({ id, apiKey })

    const { embeddings } = await this.guarded(() =>
      embeddingModel.doEmbed({
        values: ['ping'],
        abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        providerOptions: { google: { outputDimensionality: dimensions } }
      })
    )

    // A model answering with another size would corrupt the memory index later, so fail now.
    if (embeddings[0]?.length !== dimensions) throw new ProbeError('unknown')
  }

  private async guarded<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call()
    } catch (error) {
      console.error('AI connection test failed:', error)
      throw new ProbeError(classify(error), { cause: error })
    }
  }
}

interface ProviderErrorShape {
  name?: string
  message?: string
  statusCode?: number
  cause?: unknown
}

function classify(error: unknown): ProbeFailure {
  const { name, message = '', statusCode, cause } = (error ?? {}) as ProviderErrorShape

  if (name === 'TimeoutError' || name === 'AbortError') return 'timeout'

  if (statusCode === undefined) {
    // No HTTP answer: either the request never left (network) or it is not a provider error.
    return name === 'AI_APICallError' || cause !== undefined ? 'network' : 'unknown'
  }

  // Google answers a bad key with 400 and "API key not valid".
  if (statusCode === 401 || statusCode === 403 || /api key/i.test(message)) return 'invalid_key'
  if (statusCode === 429) return 'quota'
  if (statusCode === 404) return 'model_not_found'

  return 'unknown'
}
