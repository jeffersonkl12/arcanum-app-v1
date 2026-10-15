import type { Database } from '@database/client.database'
import { pointOfInterestTable } from '@database/entity/point-of-interest.entity'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type {
  CreatePointOfInterest,
  PointOfInterest,
  UpdatePointOfInterest
} from '@schema/point-of-interest.schema'
import { and, asc, eq, isNull } from 'drizzle-orm'

export interface IPointOfInterestRepository extends IRepository<
  PointOfInterest,
  CreatePointOfInterest,
  UpdatePointOfInterest
> {
  listByWorld(worldId: string): Promise<PointOfInterest[]>
  /** The places directly inside `parentId`, or the places at the top of the world when it is `null`. */
  listChildren(worldId: string, parentId: string | null): Promise<PointOfInterest[]>
}

export class PointOfInterestRepository
  extends BaseRepository<PointOfInterest, CreatePointOfInterest, UpdatePointOfInterest>
  implements IPointOfInterestRepository
{
  constructor(database: Database) {
    super(database, pointOfInterestTable)
  }

  listByWorld(worldId: string): Promise<PointOfInterest[]> {
    return this.database
      .select()
      .from(pointOfInterestTable)
      .where(eq(pointOfInterestTable.worldId, worldId))
      .orderBy(asc(pointOfInterestTable.name))
  }

  listChildren(worldId: string, parentId: string | null): Promise<PointOfInterest[]> {
    return this.database
      .select()
      .from(pointOfInterestTable)
      .where(
        and(
          eq(pointOfInterestTable.worldId, worldId),
          parentId === null
            ? isNull(pointOfInterestTable.parentId)
            : eq(pointOfInterestTable.parentId, parentId)
        )
      )
      .orderBy(asc(pointOfInterestTable.name))
  }
}
