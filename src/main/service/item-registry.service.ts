import { ConflictError, NotFoundError } from '@error'
import type { Item } from '@schema/item.schema'
import type { IActorService } from '@service/actor.service'
import type { IInventoryService } from '@service/inventory.service'
import type {
  InventoryView,
  IItemRegistry,
  ItemDraft,
  ItemEquip,
  ItemQuery,
  ItemOutcome,
  ItemTransfer,
  ItemUpdate,
  ItemView
} from '../../mastra/context/item.context'

/**
 * The AI's door to the items of the game, the counterpart of the NPC registry. It does no rule
 * checking of its own: every operation goes through `IInventoryService`, which owns the rules
 * (slots, capacity, hands). What it adds is what an AI caller needs and the UI does not:
 *
 * - **Batches.** Each entry is tried in order and has its own outcome, so one refused entry never
 *   loses the others and the model can fix just the ones that failed. Order matters because
 *   capacity is checked against what the earlier entries already did.
 * - **World scope.** The ids come from the model, so every item and actor must belong to the world
 *   of the turn; anything else answers as if it did not exist.
 * - **Rule breaches as answers.** `ConflictError` and `NotFoundError` become a `reason` the model
 *   can act on; anything else is a bug and propagates.
 */
export class ItemRegistryService implements IItemRegistry {
  constructor(
    private readonly inventoryService: IInventoryService,
    private readonly actorService: IActorService
  ) {}

  createItems(worldId: string, drafts: ItemDraft[]): Promise<ItemOutcome[]> {
    return this.each(drafts, async ({ ownerId, equip, ...draft }) => {
      if (ownerId) {
        await this.requireActor(worldId, ownerId)
      }

      const fields = {
        ...draft,
        description: draft.description ?? null
      }
      const created = ownerId
        ? await this.inventoryService.addItem(ownerId, fields)
        : await this.inventoryService.createInWorld(worldId, fields)

      if (!equip) {
        return { ok: true, itemId: created.id, item: toView(created) }
      }

      // The item exists by now, so a failure to equip it is a warning and not a failed entry.
      if (!ownerId) {
        return {
          ok: true,
          itemId: created.id,
          item: toView(created),
          warning: 'Created, but not equipped: a loose item has no one to equip it.'
        }
      }

      try {
        return await this.equipped(created.id, true)
      } catch (error) {
        return {
          ok: true,
          itemId: created.id,
          item: toView(created),
          warning: `Created, but not equipped: ${reasonOf(error)}`
        }
      }
    })
  }

  updateItems(worldId: string, updates: ItemUpdate[]): Promise<ItemOutcome[]> {
    return this.each(updates, async ({ itemId, patch }) => {
      await this.requireItem(worldId, itemId)
      const item = await this.inventoryService.updateItem(itemId, patch)

      return { ok: true, itemId, item: toView(item) }
    })
  }

  deleteItems(worldId: string, itemIds: string[]): Promise<ItemOutcome[]> {
    return this.each(itemIds, async (itemId) => {
      await this.requireItem(worldId, itemId)
      await this.inventoryService.removeItem(itemId)

      return { ok: true, itemId }
    })
  }

  transferItems(worldId: string, transfers: ItemTransfer[]): Promise<ItemOutcome[]> {
    return this.each(transfers, async ({ itemId, toActorId }) => {
      await this.requireItem(worldId, itemId)
      if (toActorId !== null) {
        await this.requireActor(worldId, toActorId)
      }
      const item = await this.inventoryService.transfer(itemId, toActorId)

      return { ok: true, itemId, item: toView(item) }
    })
  }

  equipItems(worldId: string, changes: ItemEquip[]): Promise<ItemOutcome[]> {
    return this.each(changes, async ({ itemId, equipped }) => {
      await this.requireItem(worldId, itemId)

      return this.equipped(itemId, equipped)
    })
  }

  async getInventory(worldId: string, actorId?: string): Promise<InventoryView> {
    try {
      if (!actorId) {
        const items = (await this.inventoryService.listByWorld(worldId)).filter(
          (item) => item.actorId === null
        )

        return { ok: true, items: items.map(toView) }
      }

      await this.requireActor(worldId, actorId)
      const inventory = await this.inventoryService.get(actorId)

      return {
        ok: true,
        capacity: inventory.capacity,
        usedSlots: inventory.usedSlots,
        items: inventory.items.map(toView)
      }
    } catch (error) {
      return { ok: false, reason: reasonOf(error), items: [] }
    }
  }

  async findItems(worldId: string, { itemId, name, actorId }: ItemQuery): Promise<InventoryView> {
    try {
      if (itemId) {
        return { ok: true, items: [toView(await this.requireItem(worldId, itemId))] }
      }

      if (actorId) {
        await this.requireActor(worldId, actorId)
      }

      const pool = actorId
        ? (await this.inventoryService.get(actorId)).items
        : await this.inventoryService.listByWorld(worldId)
      const wanted = normalize(name ?? '')
      const items = pool.filter((item) => normalize(item.name).includes(wanted))

      return items.length > 0
        ? { ok: true, items: items.map(toView) }
        : { ok: false, reason: `No item matches "${name}"`, items: [] }
    } catch (error) {
      return { ok: false, reason: reasonOf(error), items: [] }
    }
  }

  /** Equips or unequips a carried item and returns it as it is now. */
  private async equipped(itemId: string, equipped: boolean): Promise<ItemOutcome> {
    const inventory = equipped
      ? await this.inventoryService.equip(itemId)
      : await this.inventoryService.unequip(itemId)
    const item = inventory.items.find((candidate) => candidate.id === itemId)

    return { ok: true, itemId, item: item && toView(item) }
  }

  /** Runs the entries one after the other; a refused entry becomes a failed outcome. */
  private async each<T>(
    entries: T[],
    run: (entry: T) => Promise<ItemOutcome>
  ): Promise<ItemOutcome[]> {
    const outcomes: ItemOutcome[] = []

    for (const entry of entries) {
      try {
        outcomes.push(await run(entry))
      } catch (error) {
        outcomes.push({
          ok: false,
          itemId: typeof entry === 'string' ? entry : itemIdOf(entry),
          reason: reasonOf(error)
        })
      }
    }

    return outcomes
  }

  private async requireItem(worldId: string, itemId: string): Promise<Item> {
    const item = await this.inventoryService.getItem(itemId)

    if (item.worldId !== worldId) {
      throw new NotFoundError('Item', itemId)
    }

    return item
  }

  private async requireActor(worldId: string, actorId: string): Promise<void> {
    const actor = await this.actorService.get(actorId)

    if (actor.worldId !== worldId) {
      throw new NotFoundError('Actor', actorId)
    }
  }
}

/** The answer for a rule breach; anything that is not one is a bug and keeps propagating. */
function reasonOf(error: unknown): string {
  if (error instanceof ConflictError || error instanceof NotFoundError) {
    return error.message
  }

  throw error
}

/** Lower case without accents, so "pocao" finds "Poção". */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function itemIdOf(entry: unknown): string | undefined {
  const itemId = (entry as { itemId?: unknown } | null)?.itemId

  return typeof itemId === 'string' ? itemId : undefined
}

/** The item as the AI reads it: what does not apply to it is left out. */
function toView(item: Item): ItemView {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    slots: item.slots,
    type: item.type,
    weaponClass: item.weaponClass ?? undefined,
    clothingClass: item.clothingClass ?? undefined,
    carriedBy: item.actorId ?? undefined,
    equippedSlot: item.equippedSlot ?? undefined
  }
}
