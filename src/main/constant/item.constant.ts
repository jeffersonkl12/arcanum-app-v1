/** Every item has the same, fixed durability. */
export const ITEM_DURABILITY = 6

/** What an item is: a weapon or a piece of clothing (both can be equipped), a tool, or a consumable. */
export const ITEM_TYPES = ['weapon', 'clothing', 'tool', 'consumable'] as const

export type ItemType = (typeof ITEM_TYPES)[number]

/** How a weapon is held: light with one hand, heavy and ranged with both. */
export const WEAPON_CLASSES = ['light', 'heavy', 'ranged'] as const

export type WeaponClass = (typeof WEAPON_CLASSES)[number]

/** How heavy a piece of clothing is. */
export const CLOTHING_CLASSES = ['light', 'medium', 'heavy'] as const

export type ClothingClass = (typeof CLOTHING_CLASSES)[number]
