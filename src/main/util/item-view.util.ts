import type { Item } from '@schema/item.schema'
import type { ItemView } from '../../mastra/context/item.context'

/** The item as the AI reads it: what does not apply to it is left out. */
export function toItemView(item: Item): ItemView {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    slots: item.slots,
    goldPieces: item.goldPieces,
    silverPieces: item.silverPieces,
    bronzePieces: item.bronzePieces,
    type: item.type,
    weaponClass: item.weaponClass ?? undefined,
    clothingClass: item.clothingClass ?? undefined,
    carriedBy: item.actorId ?? undefined,
    equippedSlot: item.equippedSlot ?? undefined
  }
}
