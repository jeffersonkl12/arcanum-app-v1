import type { Database } from '@database/client.database'
import { itemTable } from '@database/entity/item.entity'
import { translateDatabaseError } from '@database/error.database'
import { BaseRepository, type IRepository } from '@repository/base.repository'
import type { Item, ItemPatch, NewItem } from '@schema/item.schema'
import { asc, eq } from 'drizzle-orm'

export interface IItemRepository extends IRepository<Item, NewItem, ItemPatch> {
  /** The inventory of an actor: its items, in a stable order. */
  listByActor(actorId: string): Promise<Item[]>
  listByWorld(worldId: string): Promise<Item[]>
  /** Takes every item out of the actor's inventory (unequipped); they stay in the world. */
  releaseByActor(actorId: string): Promise<void>
}

export class ItemRepository
  extends BaseRepository<Item, NewItem, ItemPatch>
  implements IItemRepository
{
  constructor(database: Database) {
    super(database, itemTable)
  }

  listByActor(actorId: string): Promise<Item[]> {
    return this.database
      .select()
      .from(itemTable)
      .where(eq(itemTable.actorId, actorId))
      .orderBy(asc(itemTable.name), asc(itemTable.id))
  }

  listByWorld(worldId: string): Promise<Item[]> {
    return this.database
      .select()
      .from(itemTable)
      .where(eq(itemTable.worldId, worldId))
      .orderBy(asc(itemTable.name), asc(itemTable.id))
  }

  async releaseByActor(actorId: string): Promise<void> {
    try {
      await this.database
        .update(itemTable)
        .set({ actorId: null, equippedSlot: null })
        .where(eq(itemTable.actorId, actorId))
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }
}
