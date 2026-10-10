import { worldTable } from '@database/entity/world.entity'
import type { Database } from '@database/client.database'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { CreateWorld, UpdateWorld, World, WorldFilter } from '@schema/world.schema'
import { asc, eq } from 'drizzle-orm'

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
      .where(
        filter.isTemplate === undefined ? undefined : eq(worldTable.isTemplate, filter.isTemplate)
      )
      .orderBy(asc(worldTable.name))
  }
}
