import type { AiProvider } from '@constant/ai-model.constant'

/** Providers whose embeddings can feed the characters' memory; each is also a narrator provider. */
export const EMBEDDING_PROVIDERS = ['openai', 'google'] as const satisfies readonly AiProvider[]

export type EmbeddingProvider = (typeof EMBEDDING_PROVIDERS)[number]

export interface EmbeddingModelOption {
  /** Mastra model router id (`provider/model`), checked against its list of embedding models. */
  id: `${EmbeddingProvider}/${string}`
  /** Length of every vector the model returns. Vectors of different lengths cannot share an index. */
  dimensions: number
}

/**
 * The embedding model of each provider. The vectors of two models are never comparable, so each
 * provider keeps its own memory index (see `LanceMemoryVectorStore`). Gemini's model answers with
 * 3072 numbers unless asked for fewer, so `Embedder` asks for exactly `dimensions`.
 */
export const EMBEDDING_MODELS: Readonly<Record<EmbeddingProvider, EmbeddingModelOption>> = {
  openai: { id: 'openai/text-embedding-3-small', dimensions: 1536 },
  google: { id: 'google/gemini-embedding-001', dimensions: 768 }
}

/** Kept as the default because the memories saved before the choice existed were embedded by it. */
export const DEFAULT_EMBEDDING_PROVIDER: EmbeddingProvider = 'openai'

export function isEmbeddingProvider(provider: AiProvider): provider is EmbeddingProvider {
  return (EMBEDDING_PROVIDERS as readonly AiProvider[]).includes(provider)
}
