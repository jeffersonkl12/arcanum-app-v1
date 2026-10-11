import { EQUIPMENT_SLOTS, INVENTORY_CAPACITY, type EquipmentSlot } from '@constant'
import { ConflictError } from '@error'
import type { Inventory } from '@schema/inventory.schema'
import type { Item } from '@schema/item.schema'

/** The fields of an item the rules look at. */
export type ItemTraits = Pick<
  Item,
  'isTiny' | 'slots' | 'weaponClass' | 'damageDie' | 'wearSlot' | 'armorBonus'
>

/** Throws `ConflictError` if the item breaks the item rules (the database checks the same as a backstop). */
export function assertItemRules(item: ItemTraits): void {
  if (item.isTiny ? item.slots !== 0 : item.slots < 1) {
    throw new ConflictError('A tiny item takes no inventory slots and any other takes at least one')
  }

  if ((item.weaponClass === null) !== (item.damageDie === null)) {
    throw new ConflictError('A weapon needs both its class and its damage die')
  }

  if ((item.wearSlot === null) !== (item.armorBonus === null)) {
    throw new ConflictError('A piece of clothing needs both its wear slot and its armor bonus')
  }

  if (item.weaponClass !== null && item.wearSlot !== null) {
    throw new ConflictError('An item cannot be both a weapon and a piece of clothing')
  }
}

export function sumSlots(items: readonly Pick<Item, 'slots'>[]): number {
  return items.reduce((total, item) => total + item.slots, 0)
}

/** Throws `ConflictError` if the items do not fit in the inventory. */
export function assertFitsCapacity(usedSlots: number): void {
  if (usedSlots > INVENTORY_CAPACITY) {
    throw new ConflictError(
      `The inventory has ${INVENTORY_CAPACITY} slots and this would use ${usedSlots}`
    )
  }
}

export function buildInventory(actorId: string, items: Item[]): Inventory {
  const equipment = Object.fromEntries(
    EQUIPMENT_SLOTS.map((slot) => [slot, items.find((item) => item.equippedSlot === slot) ?? null])
  ) as Inventory['equipment']
  const usedSlots = sumSlots(items)

  return {
    actorId,
    capacity: INVENTORY_CAPACITY,
    usedSlots,
    freeSlots: INVENTORY_CAPACITY - usedSlots,
    armorBonus: (equipment.torso?.armorBonus ?? 0) + (equipment.head?.armorBonus ?? 0),
    items,
    equipment
  }
}

/** Where an item goes when equipped, and the items that have to come off to make room. */
export interface EquipPlan {
  slot: EquipmentSlot
  release: Item[]
}

/**
 * Where an item goes when equipped, given what the actor already has equipped, and what it
 * replaces. A piece of clothing goes to its own place, replacing the piece worn there. A light
 * weapon takes the main hand, or the off hand when the main hand holds another light weapon (two
 * light weapons at most); with both hands full of light weapons it replaces the off hand, and it
 * replaces a weapon that takes both hands. A heavy or ranged weapon takes both hands, replacing
 * whatever is in them, and is kept in the main hand. Throws `ConflictError` for an item that
 * cannot be equipped at all.
 */
export function planEquip(item: Item, equipment: Inventory['equipment']): EquipPlan {
  if (item.equippedSlot !== null) {
    throw new ConflictError('The item is already equipped')
  }

  if (item.wearSlot !== null) {
    return { slot: item.wearSlot, release: occupants(equipment, item.wearSlot) }
  }

  if (item.weaponClass === null) {
    throw new ConflictError('Only weapons and clothing can be equipped')
  }

  const main = equipment.main_hand

  if (item.weaponClass !== 'light') {
    return { slot: 'main_hand', release: occupants(equipment, 'main_hand', 'off_hand') }
  }

  if (!main) {
    return { slot: 'main_hand', release: [] }
  }

  if (main.weaponClass !== 'light') {
    return { slot: 'main_hand', release: [main] }
  }

  return { slot: 'off_hand', release: occupants(equipment, 'off_hand') }
}

function occupants(equipment: Inventory['equipment'], ...slots: EquipmentSlot[]): Item[] {
  return slots.flatMap((slot) => equipment[slot] ?? [])
}
