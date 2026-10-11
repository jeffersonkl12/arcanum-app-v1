import { ConflictError, NotFoundError } from '@error'
import type { IActorRepository } from '@repository/actor.repository'
import type { IItemRepository } from '@repository/item.repository'
import type { IWorldRepository } from '@repository/world.repository'
import type { Inventory } from '@schema/inventory.schema'
import type { CreateItem, Item, ItemPatch, UpdateItem } from '@schema/item.schema'
import type { Actor } from '@schema/actor.schema'
import {
  assertFitsCapacity,
  assertItemRules,
  buildInventory,
  planEquip,
  sumSlots
} from '@util/inventory.util'

export interface IInventoryService {
  /** The inventory of an actor. Throws `NotFoundError` if the actor does not exist. */
  get(actorId: string): Promise<Inventory>
  /** Creates an item that is just somewhere in the world, carried by nobody. */
  createInWorld(worldId: string, input: CreateItem): Promise<Item>
  /** Creates an item straight into an actor's inventory; `ConflictError` if it does not fit. */
  addItem(actorId: string, input: CreateItem): Promise<Item>
  listByWorld(worldId: string): Promise<Item[]>
  getItem(itemId: string): Promise<Item>
  updateItem(itemId: string, patch: UpdateItem): Promise<Item>
  /** Deletes the item from the world for good, carried or not. */
  removeItem(itemId: string): Promise<void>
  /** Puts an item of the world that nobody carries into an actor's inventory (same world, if it fits). */
  give(itemId: string, actorId: string): Promise<Inventory>
  /** Takes the item out of the inventory (unequipping it); it stays in the world. */
  drop(itemId: string): Promise<Item>
  /** Equips a carried item where it belongs, unequipping whatever it replaces. */
  equip(itemId: string): Promise<Inventory>
  unequip(itemId: string): Promise<Inventory>
  /** Uses up a carried consumable: it is deleted and returned so its effect can be applied. */
  consume(itemId: string): Promise<Item>
}

/**
 * An item belongs to a world and may be carried by one actor of that world. An actor carries at
 * most `INVENTORY_CAPACITY` slots (tiny items take none), and can wear one piece of clothing on the
 * torso and one on the head, and hold either one weapon or two light weapons; weapons that take
 * both hands take both (equipping over something unequips it). Every rule breach is a `ConflictError`. The checks are not atomic
 * with the writes, which is fine for a single local player; the database still refuses two items
 * in the same place, and an item carried by an actor of another world.
 */
export class InventoryService implements IInventoryService {
  constructor(
    private readonly itemRepository: IItemRepository,
    private readonly actorRepository: IActorRepository,
    private readonly worldRepository: IWorldRepository
  ) {}

  async get(actorId: string): Promise<Inventory> {
    await this.requireActor(actorId)

    return buildInventory(actorId, await this.itemRepository.listByActor(actorId))
  }

  async createInWorld(worldId: string, input: CreateItem): Promise<Item> {
    if (!(await this.worldRepository.findById(worldId))) {
      throw new NotFoundError('World', worldId)
    }

    const traits = resolveTraits(input)
    assertItemRules(traits)

    return this.itemRepository.create({
      ...input,
      ...traits,
      worldId,
      actorId: null,
      equippedSlot: null
    })
  }

  async addItem(actorId: string, input: CreateItem): Promise<Item> {
    const actor = await this.requireActor(actorId)
    const traits = resolveTraits(input)
    assertItemRules(traits)

    const carried = await this.itemRepository.listByActor(actorId)
    assertFitsCapacity(sumSlots(carried) + traits.slots)

    return this.itemRepository.create({
      ...input,
      ...traits,
      worldId: actor.worldId,
      actorId,
      equippedSlot: null
    })
  }

  listByWorld(worldId: string): Promise<Item[]> {
    return this.itemRepository.listByWorld(worldId)
  }

  async getItem(itemId: string): Promise<Item> {
    const item = await this.itemRepository.findById(itemId)

    if (!item) {
      throw new NotFoundError('Item', itemId)
    }

    return item
  }

  async updateItem(itemId: string, patch: UpdateItem): Promise<Item> {
    const item = await this.getItem(itemId)

    const isTiny = patch.isTiny ?? item.isTiny
    const slots = isTiny ? 0 : (patch.slots ?? (item.isTiny ? 1 : item.slots))
    const traits = {
      isTiny,
      slots,
      weaponClass: patch.weaponClass === undefined ? item.weaponClass : patch.weaponClass,
      damageDie: patch.damageDie === undefined ? item.damageDie : patch.damageDie,
      wearSlot: patch.wearSlot === undefined ? item.wearSlot : patch.wearSlot,
      armorBonus: patch.armorBonus === undefined ? item.armorBonus : patch.armorBonus
    }
    assertItemRules(traits)

    if (
      item.equippedSlot !== null &&
      (traits.weaponClass !== item.weaponClass || traits.wearSlot !== item.wearSlot)
    ) {
      throw new ConflictError('Unequip the item before changing how it is held or worn')
    }

    if (item.actorId !== null) {
      const carried = await this.itemRepository.listByActor(item.actorId)
      assertFitsCapacity(sumSlots(carried) - item.slots + slots)
    }

    return this.requireUpdated(itemId, { ...patch, ...traits })
  }

  async removeItem(itemId: string): Promise<void> {
    if (!(await this.itemRepository.delete(itemId))) {
      throw new NotFoundError('Item', itemId)
    }
  }

  async give(itemId: string, actorId: string): Promise<Inventory> {
    const item = await this.getItem(itemId)
    const actor = await this.requireActor(actorId)

    if (item.actorId !== null) {
      throw new ConflictError('The item is already carried; drop it first')
    }

    if (item.worldId !== actor.worldId) {
      throw new ConflictError('The item and the actor belong to different worlds')
    }

    const carried = await this.itemRepository.listByActor(actorId)
    assertFitsCapacity(sumSlots(carried) + item.slots)

    await this.requireUpdated(itemId, { actorId })

    return this.get(actorId)
  }

  async drop(itemId: string): Promise<Item> {
    const item = await this.getItem(itemId)

    if (item.actorId === null) {
      throw new ConflictError('The item is not carried by anyone')
    }

    return this.requireUpdated(itemId, { actorId: null, equippedSlot: null })
  }

  async equip(itemId: string): Promise<Inventory> {
    const item = await this.getItem(itemId)
    const actorId = this.requireCarrier(item)
    const { equipment } = await this.get(actorId)

    // What is in the way comes off first (the database allows one item per place).
    const { slot, release } = planEquip(item, equipment)
    for (const replaced of release) {
      await this.requireUpdated(replaced.id, { equippedSlot: null })
    }
    await this.requireUpdated(itemId, { equippedSlot: slot })

    return this.get(actorId)
  }

  async unequip(itemId: string): Promise<Inventory> {
    const item = await this.getItem(itemId)
    const actorId = this.requireCarrier(item)

    if (item.equippedSlot === null) {
      throw new ConflictError('The item is not equipped')
    }

    await this.requireUpdated(itemId, { equippedSlot: null })

    return this.get(actorId)
  }

  async consume(itemId: string): Promise<Item> {
    const item = await this.getItem(itemId)
    this.requireCarrier(item)

    if (!item.isConsumable) {
      throw new ConflictError('The item is not a consumable')
    }

    await this.removeItem(itemId)

    return item
  }

  private requireCarrier(item: Item): string {
    if (item.actorId === null) {
      throw new ConflictError('The item is not in anyone’s inventory')
    }

    return item.actorId
  }

  private async requireActor(actorId: string): Promise<Actor> {
    const actor = await this.actorRepository.findById(actorId)

    if (!actor) {
      throw new NotFoundError('Actor', actorId)
    }

    return actor
  }

  private async requireUpdated(itemId: string, patch: ItemPatch): Promise<Item> {
    const item = await this.itemRepository.update(itemId, patch)

    if (!item) {
      throw new NotFoundError('Item', itemId)
    }

    return item
  }
}

/** The item as it will be stored: a tiny item takes no slots, any other takes `slots` (1 if not said). */
function resolveTraits(input: CreateItem) {
  const isTiny = input.isTiny ?? false

  return {
    isTiny,
    slots: isTiny ? 0 : (input.slots ?? 1),
    weaponClass: input.weaponClass ?? null,
    damageDie: input.damageDie ?? null,
    wearSlot: input.wearSlot ?? null,
    armorBonus: input.armorBonus ?? null
  }
}
