import type { EquipmentSlot } from '@constant'
import type { Item } from '@schema/item.schema'

/**
 * The inventory of an actor as the engine sees it. `usedSlots` is the sum of the slots of every item
 * carried (equipped or not); `armorBonus` is the sum of the bonus of the clothing worn.
 */
export interface Inventory {
  actorId: string
  capacity: number
  usedSlots: number
  freeSlots: number
  armorBonus: number
  items: Item[]
  equipment: Record<EquipmentSlot, Item | null>
}
