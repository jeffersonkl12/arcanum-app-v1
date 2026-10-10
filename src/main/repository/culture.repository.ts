import type { Database } from '@database/client.database'
import { cultureTable } from '@database/entity/culture.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { CreateCulture, Culture, UpdateCulture } from '@schema/culture.schema'
import { asc, eq } from 'drizzle-orm'

export interface ICultureRepository extends IRepository<Culture, CreateCulture, UpdateCulture> {
  listByWorld(worldId: string): Promise<Culture[]>
}

export class CultureRepository
  extends BaseRepository<Culture, CreateCulture, UpdateCulture>
  implements ICultureRepository
{
  constructor(database: Database) {
    super(database, cultureTable)
  }

  listByWorld(worldId: string): Promise<Culture[]> {
    return this.database
      .select()
      .from(cultureTable)
      .where(eq(cultureTable.worldId, worldId))
      .orderBy(asc(cultureTable.name))
  }
}
