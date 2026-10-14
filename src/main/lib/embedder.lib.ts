import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { AI_MODEL_CATALOG } from '@constant'
import { ConflictError } from '@error'

export interface IEmbedder {
  /** Length of every vector it returns. Vectors of different lengths cannot share an index. */
  readonly dimensions: number
  /** Whether it can embed right now (for a hosted model: whether a key is configured). */
  isAvailable(): Promise<boolean>
  /** One vector per value, in order. Throws `ConflictError` when it is not available. */
  embed(values: string[]): Promise<number[][]>
}

const OPENAI_EMBEDDING_MODEL = 'openai/text-embedding-3-small'
const OPENAI_EMBEDDING_DIMENSIONS = 1536

/**
 * Embeddings from OpenAI's `text-embedding-3-small`, through Mastra's model router. The key is
 * asked for on every call, because the player can change it while the app runs: the one saved in
 * the app when OpenAI is also the chat provider, or else the `OPENAI_API_KEY` environment variable
 * (which the router reads on its own when no key is given).
 */
export class OpenAiEmbedder implements IEmbedder {
  readonly dimensions = OPENAI_EMBEDDING_DIMENSIONS

  constructor(
    private readonly savedKey: () => Promise<string | undefined>,
    private readonly environment: NodeJS.ProcessEnv = process.env
  ) {}

  async isAvailable(): Promise<boolean> {
    return Boolean(
      (await this.savedKey()) ?? this.environment[AI_MODEL_CATALOG.openai.apiKeyEnvVar]
    )
  }

  async embed(values: string[]): Promise<number[][]> {
    if (!(await this.isAvailable())) {
      throw new ConflictError(
        'Memory needs an OpenAI API key for its embeddings, and there is none'
      )
    }
    if (values.length === 0) return []

    const model = new ModelRouterEmbeddingModel({
      id: OPENAI_EMBEDDING_MODEL,
      apiKey: await this.savedKey()
    })
    const { embeddings } = await model.doEmbed({ values })

    return embeddings
  }
}
