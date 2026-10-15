import { randomUUID } from 'node:crypto'
import { MEMORY_IMPORTANCE, MEMORY_SEARCH, type EmbeddingProvider } from '@constant'
import { ConflictError } from '@error'
import type { IEmbedder } from '@lib/embedder.lib'
import type { IMemoryVectorStore } from '@lib/memory-vector.lib'
import type { Actor } from '@schema/actor.schema'
import type { CreateMemory, Memory, MemoryWithActors } from '@schema/memory.schema'
import type { IActorService } from '@service/actor.service'
import { rankMemoryHits } from '@util/memory.util'

export interface MemorySearchOptions {
  limit: number
  /** Cosine similarity a memory needs to be returned at all. */
  minSimilarity: number
  /** Only memories this actor shares. */
  actorId?: string
}

/** `duplicate` is the stored memory the new one repeats; nothing was added. */
export interface RememberResult {
  status: 'saved' | 'duplicate'
  memory: MemoryWithActors
}

export interface IMemoryService {
  /** Whether memories can be stored and searched now (the embeddings need a key). */
  isAvailable(): Promise<boolean>
  /**
   * Stores a memory shared by its actors. Throws `ConflictError` if an actor is not in the world or
   * the embeddings are not available. A memory that repeats a stored one is not stored twice.
   */
  remember(input: CreateMemory): Promise<RememberResult>
  /** Memories closest in meaning to the query, with importance breaking close calls. Needs embeddings. */
  search(worldId: string, query: string, options: MemorySearchOptions): Promise<MemoryWithActors[]>
  /** The newest memories of the campaign, oldest first. */
  listRecent(worldId: string, limit: number): Promise<MemoryWithActors[]>
  /** The newest defining memories (maximum importance), oldest first. */
  listPinned(worldId: string, limit: number): Promise<MemoryWithActors[]>
  /** Forgets every memory of the world. */
  deleteByWorld(worldId: string): Promise<void>
}

/**
 * The memories of a campaign's characters. A memory is one record shared by the actors who lived
 * it, with a summary that is embedded for the semantic search and an importance that ranks it.
 * Actors are checked against the world on the way in and resolved to their current names on the
 * way out, so a renamed character reads right and a deleted one just stops being listed.
 */
export class MemoryService implements IMemoryService {
  constructor(
    private readonly store: IMemoryVectorStore,
    private readonly embedder: IEmbedder,
    private readonly actorService: IActorService
  ) {}

  isAvailable(): Promise<boolean> {
    return this.embedder.isAvailable()
  }

  async remember(input: CreateMemory): Promise<RememberResult> {
    const actorIds = [...new Set(input.actorIds)]
    await this.requireActors(input.worldId, actorIds)

    const provider = await this.embedder.provider()
    const [vector] = await this.embedder.embed([input.summary])
    const repeated = await this.findRepeated(provider, input.worldId, actorIds, vector)
    if (repeated) return { status: 'duplicate', memory: await this.withActor(repeated) }

    const memory: Memory = { ...input, actorIds, id: randomUUID(), createdAt: new Date() }
    await this.store.add(provider, memory, vector)

    return { status: 'saved', memory: await this.withActor(memory) }
  }

  async search(
    worldId: string,
    query: string,
    { limit, minSimilarity, actorId }: MemorySearchOptions
  ): Promise<MemoryWithActors[]> {
    const provider = await this.embedder.provider()
    const [vector] = await this.embedder.embed([query])
    const hits = await this.store.search(provider, {
      worldId,
      vector,
      actorId,
      limit: limit * MEMORY_SEARCH.candidatesPerResult
    })

    const best = rankMemoryHits(hits.filter((hit) => hit.similarity >= minSimilarity))
      .slice(0, limit)
      .map((hit) => hit.memory)

    return this.resolveActors(worldId, best)
  }

  async listRecent(worldId: string, limit: number): Promise<MemoryWithActors[]> {
    const newest = await this.store.listRecent(await this.embedder.provider(), worldId, limit)

    return this.resolveActors(worldId, newest.reverse())
  }

  async listPinned(worldId: string, limit: number): Promise<MemoryWithActors[]> {
    const newest = await this.store.listByImportance(
      await this.embedder.provider(),
      worldId,
      MEMORY_IMPORTANCE.pinned,
      limit
    )

    return this.resolveActors(worldId, newest.reverse())
  }

  deleteByWorld(worldId: string): Promise<void> {
    return this.store.deleteByWorld(worldId)
  }

  private async requireActors(worldId: string, actorIds: string[]): Promise<void> {
    const inWorld = new Set((await this.actorService.listByWorld(worldId)).map((a) => a.id))
    const stranger = actorIds.find((id) => !inWorld.has(id))

    if (stranger) throw new ConflictError(`Actor ${stranger} does not belong to this world`)
  }

  /** The stored memory the new one repeats: nearly the same meaning and at least one actor in common. */
  private async findRepeated(
    provider: EmbeddingProvider,
    worldId: string,
    actorIds: string[],
    vector: number[]
  ): Promise<Memory | undefined> {
    const hits = await this.store.search(provider, { worldId, vector, limit: 3 })

    return hits.find(
      (hit) =>
        hit.similarity >= MEMORY_SEARCH.duplicateSimilarity &&
        hit.memory.actorIds.some((id) => actorIds.includes(id))
    )?.memory
  }

  private async withActor(memory: Memory): Promise<MemoryWithActors> {
    const [resolved] = await this.resolveActors(memory.worldId, [memory])

    // The actors were just checked, so a memory that resolves to nobody cannot happen here.
    return resolved
  }

  /** Names the actors of each memory; one whose actors are all gone has no one left to remember it. */
  private async resolveActors(worldId: string, memories: Memory[]): Promise<MemoryWithActors[]> {
    if (memories.length === 0) return []

    const actors = new Map<string, Actor>(
      (await this.actorService.listByWorld(worldId)).map((actor) => [actor.id, actor])
    )

    return memories.flatMap(({ actorIds, ...memory }) => {
      const present = actorIds.flatMap((id) => {
        const actor = actors.get(id)
        return actor ? [{ id, name: actor.name }] : []
      })

      return present.length > 0 ? [{ ...memory, actors: present }] : []
    })
  }
}
