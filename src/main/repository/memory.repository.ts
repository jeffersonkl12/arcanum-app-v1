import type { EmbeddingProvider } from '@constant'
import type { Database } from '@database/client.database'
import { memoryEmbeddingTables, memoryTable } from '@database/entity/memory.entity'
import { translateDatabaseError } from '@database/error.database'
import type { Memory } from '@schema/memory.schema'
import type { MemoryHit } from '@util/memory.util'
import {
  and,
  arrayContains,
  cosineDistance,
  desc,
  eq,
  getTableColumns,
  gte,
  sql,
  type SQL
} from 'drizzle-orm'

export interface MemorySearch {
  worldId: string
  vector: number[]
  limit: number
  /** Only memories this actor shares. */
  actorId?: string
}

/**
 * The memories are rows like any other of the game database; only the search needs a provider,
 * because it compares the query against the embeddings that provider's model made. A memory
 * embedded by another provider is still listed, it just cannot be found by meaning until the player
 * switches back to that provider.
 */
export interface IMemoryRepository {
  /** Stores a memory with the embedding of its summary, both or neither. */
  add(provider: EmbeddingProvider, memory: Memory, vector: number[]): Promise<void>
  /** The memories closest to the vector, most similar first. */
  search(provider: EmbeddingProvider, query: MemorySearch): Promise<MemoryHit<Memory>[]>
  /** The newest memories of the world, newest first. */
  listRecent(worldId: string, limit: number): Promise<Memory[]>
  /** The newest memories of the world at or above `minImportance`, newest first. */
  listByImportance(worldId: string, minImportance: number, limit: number): Promise<Memory[]>
  /** The newest memories the actor shares, newest first. */
  listByActor(worldId: string, actorId: string, limit: number): Promise<Memory[]>
  /** Forgets every memory of the world, with their embeddings. */
  deleteByWorld(worldId: string): Promise<void>
}

/**
 * Memories in the game database, with their embeddings in pgvector columns. A memory and its
 * embedding are written in one transaction, and the embedding goes with the memory (and the memory
 * with its world), so nothing is left behind. The search is an exact scan on purpose: a campaign
 * holds hundreds of memories, where it is fast and never misses a match.
 */
export class MemoryRepository implements IMemoryRepository {
  constructor(private readonly database: Database) {}

  async add(provider: EmbeddingProvider, memory: Memory, vector: number[]): Promise<void> {
    try {
      await this.database.transaction(async (tx) => {
        await tx.insert(memoryTable).values(memory)
        await tx
          .insert(memoryEmbeddingTables[provider])
          .values({ memoryId: memory.id, embedding: vector })
      })
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async search(
    provider: EmbeddingProvider,
    { worldId, vector, limit, actorId }: MemorySearch
  ): Promise<MemoryHit<Memory>[]> {
    const embeddings = memoryEmbeddingTables[provider]
    const distance = cosineDistance(embeddings.embedding, vector)

    const rows = await this.database
      .select({ memory: getTableColumns(memoryTable), similarity: sql<number>`1 - (${distance})` })
      .from(embeddings)
      .innerJoin(memoryTable, eq(embeddings.memoryId, memoryTable.id))
      .where(
        and(
          eq(memoryTable.worldId, worldId),
          actorId ? arrayContains(memoryTable.actorIds, [actorId]) : undefined
        )
      )
      .orderBy(distance)
      .limit(limit)

    return rows.map(({ memory, similarity }) => ({ memory, similarity: Number(similarity) }))
  }

  listRecent(worldId: string, limit: number): Promise<Memory[]> {
    return this.listNewest(eq(memoryTable.worldId, worldId), limit)
  }

  listByImportance(worldId: string, minImportance: number, limit: number): Promise<Memory[]> {
    return this.listNewest(
      and(eq(memoryTable.worldId, worldId), gte(memoryTable.importance, minImportance)),
      limit
    )
  }

  listByActor(worldId: string, actorId: string, limit: number): Promise<Memory[]> {
    return this.listNewest(
      and(eq(memoryTable.worldId, worldId), arrayContains(memoryTable.actorIds, [actorId])),
      limit
    )
  }

  async deleteByWorld(worldId: string): Promise<void> {
    await this.database.delete(memoryTable).where(eq(memoryTable.worldId, worldId))
  }

  private listNewest(where: SQL | undefined, limit: number): Promise<Memory[]> {
    return this.database
      .select()
      .from(memoryTable)
      .where(where)
      .orderBy(desc(memoryTable.createdAt))
      .limit(limit)
  }
}
