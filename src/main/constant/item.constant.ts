/** Every item has the same, fixed durability. */
export const ITEM_DURABILITY = 6

/** How a weapon is held: light with one hand, heavy and ranged with both. */
export const WEAPON_CLASSES = ['light', 'heavy', 'ranged'] as const

export type WeaponClass = (typeof WEAPON_CLASSES)[number]

/** Damage dice, from the lowest damage to the highest. */
export const WEAPON_DICE = ['d4', 'd6', 'd8', 'd12'] as const

export type WeaponDie = (typeof WEAPON_DICE)[number]

/** The places of the body where a piece of clothing can be worn. */
export const WEAR_SLOTS = ['torso', 'head'] as const

export type WearSlot = (typeof WEAR_SLOTS)[number]

/** Armor bonus of a piece of clothing: 0 is common clothing, 3 is the most protection the system allows. */
export const ARMOR_BONUS = { min: 0, max: 3 } as const

/** Most inventory slots a single item can be given; a sanity limit, the inventory capacity is what really bounds it. */
export const ITEM_MAX_SLOTS = 99
