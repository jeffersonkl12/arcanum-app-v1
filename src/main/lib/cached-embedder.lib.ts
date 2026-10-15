import type { EmbeddingProvider } from '@constant'
import type { IEmbedder } from '@lib/embedder.lib'

/** Texts kept at once; the player's last messages are all that is asked for twice. */
const MAX_ENTRIES = 32

/**
 * Remembers the vector of the texts it embedded last, so asking for the same text again costs
 * nothing. The player's message is searched twice every turn (the memories and the documents),
 * and with this it is sent to the provider once, even when both searches start together: the
 * second one waits for the first. A failed call is forgotten, not kept.
 *
 * The provider is part of the key, because the vectors of two models are never the same.
 */
export class CachedEmbedder implements IEmbedder {
  private readonly vectors = new Map<string, Promise<number[]>>()

  constructor(private readonly embedder: IEmbedder) {}

  provider(): Promise<EmbeddingProvider> {
    return this.embedder.provider()
  }

  isAvailable(): Promise<boolean> {
    return this.embedder.isAvailable()
  }

  async embed(values: string[]): Promise<number[][]> {
    const provider = await this.embedder.provider()
    const keys = values.map((value) => `${provider}\n${value}`)

    const missing = [...new Set(values.filter((_, index) => !this.vectors.has(keys[index])))]
    if (missing.length > 0) this.fetch(provider, missing)

    return Promise.all(keys.map((key) => this.vectors.get(key) as Promise<number[]>))
  }

  /** Starts one call for all the texts not known yet; each text waits for its own vector. */
  private fetch(provider: EmbeddingProvider, texts: string[]): void {
    const call = this.embedder.embed(texts)

    texts.forEach((text, index) => {
      const key = `${provider}\n${text}`
      const vector = call.then((vectors) => vectors[index])

      this.vectors.set(key, vector)
      vector.catch(() => this.vectors.delete(key))
    })

    while (this.vectors.size > MAX_ENTRIES) {
      this.vectors.delete(this.vectors.keys().next().value as string)
    }
  }
}
