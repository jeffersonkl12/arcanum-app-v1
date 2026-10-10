import { worldTable } from '@database/entity/world.entity'
import type { Database } from '@database/client.database'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { CreateWorld, UpdateWorld, World, WorldFilter } from '@schema/world.schema'
import { and, asc, eq, ilike, inArray, type SQL } from 'drizzle-orm'

export interface IWorldRepository extends IRepository<World, CreateWorld, UpdateWorld> {
  list(filter?: WorldFilter): Promise<World[]>
}

export class WorldRepository
  extends BaseRepository<World, CreateWorld, UpdateWorld>
  implements IWorldRepository
{
  constructor(database: Database) {
    super(database, worldTable)
  }

  list(filter: WorldFilter = {}): Promise<World[]> {
    return this.database
      .select()
      .from(worldTable)
      .where(and(...buildConditions(filter)))
      .orderBy(asc(worldTable.name))
  }
}

function buildConditions(filter: WorldFilter): SQL[] {
  const conditions: SQL[] = []

  if (filter.isTemplate !== undefined) conditions.push(eq(worldTable.isTemplate, filter.isTemplate))
  if (filter.name) conditions.push(ilike(worldTable.name, `%${escapeLike(filter.name)}%`))
  if (filter.genres?.length) conditions.push(inArray(worldTable.genre, filter.genres))
  if (filter.sourceWorldId) conditions.push(eq(worldTable.sourceWorldId, filter.sourceWorldId))

  return conditions
}

/** `%` and `_` typed by the user must match themselves, not act as wildcards. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&')
}
