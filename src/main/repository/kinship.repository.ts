import type { Database } from '@database/client.database'
import { kinshipTable } from '@database/entity/kinship.entity'
import { translateDatabaseError } from '@database/error.database'
import type { Kinship } from '@schema/kinship.schema'
import { and, eq, inArray } from 'drizzle-orm'
import type { KinshipLink } from '@util/kinship.util'

export interface IKinshipRepository {
  /** Every direct bond of the world. */
  listByWorld(worldId: string): Promise<Kinship[]>
  /**
   * Drops the bond between the two actors (whichever way it points) and, when `link` is given,
   * stores it in its place, in a single transaction.
   */
  replace(worldId: string, aId: string, bId: string, link?: KinshipLink): Promise<void>
  /** Stores all the links in a single statement: either all of them arrive or none does. */
  addMany(worldId: string, links: KinshipLink[]): Promise<void>
}

export class KinshipRepository implements IKinshipRepository {
  constructor(private readonly database: Database) {}

  listByWorld(worldId: string): Promise<Kinship[]> {
    return this.database.select().from(kinshipTable).where(eq(kinshipTable.worldId, worldId))
  }

  async replace(worldId: string, aId: string, bId: string, link?: KinshipLink): Promise<void> {
    try {
      await this.database.transaction(async (tx) => {
        await tx
          .delete(kinshipTable)
          .where(
            and(
              inArray(kinshipTable.fromActorId, [aId, bId]),
              inArray(kinshipTable.toActorId, [aId, bId])
            )
          )
        if (link) await tx.insert(kinshipTable).values({ worldId, ...link })
      })
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }

  async addMany(worldId: string, links: KinshipLink[]): Promise<void> {
    if (links.length === 0) return

    try {
      await this.database.insert(kinshipTable).values(links.map((link) => ({ worldId, ...link })))
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }
}
