import type { CreateItem } from '@schema'

export type ItemType = CreateItem['type']
type WeaponClass = NonNullable<CreateItem['weaponClass']>
type ClothingClass = NonNullable<CreateItem['clothingClass']>

interface Option<TValue extends string> {
  value: TValue
  label: string
}

export const itemTypeOptions: readonly Option<ItemType>[] = [
  { value: 'weapon', label: 'Arma' },
  { value: 'clothing', label: 'Vestimenta' },
  { value: 'tool', label: 'Ferramenta' },
  { value: 'consumable', label: 'Consumível' }
]

export const itemTypeValues = [
  'weapon',
  'clothing',
  'tool',
  'consumable'
] as const satisfies readonly ItemType[]

export const weaponClassOptions: readonly Option<WeaponClass>[] = [
  { value: 'light', label: 'Leve (uma mão)' },
  { value: 'heavy', label: 'Pesada (duas mãos)' },
  { value: 'ranged', label: 'À distância (duas mãos)' }
]

export const weaponClassValues = [
  'light',
  'heavy',
  'ranged'
] as const satisfies readonly WeaponClass[]

export const clothingClassOptions: readonly Option<ClothingClass>[] = [
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Média' },
  { value: 'heavy', label: 'Pesada' }
]

export const clothingClassValues = [
  'light',
  'medium',
  'heavy'
] as const satisfies readonly ClothingClass[]

/** Mirrors the item rules of the engine: every item has the same durability and takes at least one slot. */
export const itemLimits = {
  durability: 6,
  inventoryCapacity: 18
} as const

export function labelOf<TValue extends string>(
  options: readonly Option<TValue>[],
  value: TValue | null | undefined
): string {
  return options.find((option) => option.value === value)?.label ?? ''
}
