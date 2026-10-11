/** Inventory slots an actor can carry; tiny items take none. */
export const INVENTORY_CAPACITY = 12

/** Where an equipped item is: a weapon in a hand, or a piece of clothing on the torso or head. */
export const EQUIPMENT_SLOTS = ['main_hand', 'off_hand', 'torso', 'head'] as const

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number]
