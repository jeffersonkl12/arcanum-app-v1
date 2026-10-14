import { connect, type Connection, type Table } from '@lancedb/lancedb'
import { MEMORY_KINDS, type MemoryKind } from '@constant'
import type { Memory } from '@schema/memory.schema'
import type { MemoryHit } from '@util/memory.util'
import { z } from 'zod'

export interface MemorySearch {
  worldId: string
  vector: number[]
  limit: number
  /** Only memories this actor shares. */
  actorId?: string
}

export interface IMemoryVectorStore {
  /** Stores a memory with the embedding of its summary. */
  add(memory: Memory, vector: number[]): Promise<void>
  /** The memories closest to the vector, most similar first. */
  search(query: MemorySearch): Promise<MemoryHit<Memory>[]>
  /** The newest memories of the world, newest first. */
  listRecent(worldId: string, limit: number): Promise<Memory[]>
  /** The newest memories of the world at or above `minImportance`, newest first. */
  listByImportance(worldId: string, minImportance: number, limit: number): Promise<Memory[]>
  /** Forgets every memory of the world. */
  deleteByWorld(worldId: string): Promise<void>
}

const TABLE = 'memory'
const uuid = z.uuid()

/** One row of the table; LanceDB gives a list column back as an Arrow vector, hence `Iterable`. */
interface MemoryRow {
  id: string
  world_id: string
  summary: string
  kind: string
  importance: number
  actor_ids: Iterable<string>
  created_at: number
  _distance?: number
}

/**
 * Memories as vectors in LanceDB, an embedded database (a folder, no server). Each row carries the
 * memory and the embedding of its summary, so it is one source of truth, and a memory with several
 * actors is one row with a list of ids.
 *
 * The table is created by the first memory, which fixes the dimension of the embeddings: vectors
 * from a model of another size are refused by LanceDB. There is no ANN index on purpose: a
 * campaign holds hundreds of memories, where an exact scan is fast and never misses a match.
 *
 * Ids end up inside the filter expressions and some come from the model, so each is checked as a
 * UUID before it gets there.
 */
export class LanceMemoryVectorStore implements IMemoryVectorStore {
  private connection?: Promise<Connection>
  /** Tail of the queue of writes: one at a time, so the first two cannot both create the table. */
  private writes: Promise<unknown> = Promise.resolve()

  constructor(private readonly folder: string) {}

  async add(memory: Memory, vector: number[]): Promise<void> {
    const row = {
      id: memory.id,
      world_id: memory.worldId,
      summary: memory.summary,
      kind: memory.kind,
      importance: memory.importance,
      actor_ids: memory.actorIds,
      created_at: memory.createdAt.getTime(),
      vector
    }

    const write = this.writes.then(async () => {
      const table = await this.openTable()
      if (table) await table.add([row])
      else await (await this.connect()).createTable(TABLE, [row])
    })
    // A failed write must not poison the ones queued behind it.
    this.writes = write.catch(() => undefined)

    return write
  }

  async search({ worldId, vector, limit, actorId }: MemorySearch): Promise<MemoryHit<Memory>[]> {
    const table = await this.openTable()
    if (!table) return []

    const rows: MemoryRow[] = await table
      .vectorSearch(vector)
      .distanceType('cosine')
      .where(filter(worldId, actorId ? `array_contains(actor_ids, '${id(actorId)}')` : undefined))
      .limit(limit)
      .toArray()

    // With the cosine metric LanceDB reports a distance of `1 - similarity`.
    return rows.map((row) => ({ memory: toMemory(row), similarity: 1 - (row._distance ?? 1) }))
  }

  async listRecent(worldId: string, limit: number): Promise<Memory[]> {
    return this.listNewest(filter(worldId), limit)
  }

  async listByImportance(worldId: string, minImportance: number, limit: number): Promise<Memory[]> {
    return this.listNewest(filter(worldId, `importance >= ${Number(minImportance)}`), limit)
  }

  async deleteByWorld(worldId: string): Promise<void> {
    const table = await this.openTable()

    await table?.delete(filter(worldId))
  }

  private async listNewest(predicate: string, limit: number): Promise<Memory[]> {
    const table = await this.openTable()
    if (!table) return []

    const rows: MemoryRow[] = await table
      .query()
      .where(predicate)
      .orderBy({ columnName: 'created_at', ascending: false })
      .limit(limit)
      .toArray()

    return rows.map(toMemory)
  }

  private connect(): Promise<Connection> {
    this.connection ??= connect(this.folder)

    return this.connection
  }

  /** The table, or `undefined` while no memory was ever stored. */
  private async openTable(): Promise<Table | undefined> {
    const connection = await this.connect()
    if (!(await connection.tableNames()).includes(TABLE)) return undefined

    return connection.openTable(TABLE)
  }
}

function id(value: string): string {
  return uuid.parse(value)
}

function filter(worldId: string, extra?: string): string {
  const world = `world_id = '${id(worldId)}'`

  return extra ? `${world} AND ${extra}` : world
}

function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    worldId: row.world_id,
    summary: row.summary,
    kind: MEMORY_KINDS.includes(row.kind as MemoryKind) ? (row.kind as MemoryKind) : 'other',
    importance: row.importance,
    actorIds: Array.from(row.actor_ids),
    createdAt: new Date(row.created_at)
  }
}
