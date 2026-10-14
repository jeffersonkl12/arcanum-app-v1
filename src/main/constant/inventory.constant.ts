/**
 * Inventory slots an actor can carry, for everything it has. An item takes at least one slot, and
 * no more than this (a bigger one could never be carried).
 */
export const INVENTORY_CAPACITY = 18

/** Where an equipped item is: a weapon in a hand (or both), or the one piece of clothing worn on the body. */
export const EQUIPMENT_SLOTS = ['main_hand', 'off_hand', 'body'] as const

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number]
