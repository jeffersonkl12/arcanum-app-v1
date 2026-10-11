import type { CreateItem } from '@schema'

type WeaponClass = NonNullable<CreateItem['weaponClass']>
type WeaponDie = NonNullable<CreateItem['damageDie']>
type WearSlot = NonNullable<CreateItem['wearSlot']>

export type ItemKind = 'common' | 'weapon' | 'wearable'

interface Option<TValue extends string> {
  value: TValue
  label: string
}

export const itemKindOptions: readonly Option<ItemKind>[] = [
  { value: 'common', label: 'Objeto comum' },
  { value: 'weapon', label: 'Arma' },
  { value: 'wearable', label: 'Vestimenta' }
]

export const itemKindValues = [
  'common',
  'weapon',
  'wearable'
] as const satisfies readonly ItemKind[]

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

export const weaponDieOptions: readonly Option<WeaponDie>[] = [
  { value: 'd4', label: 'd4' },
  { value: 'd6', label: 'd6' },
  { value: 'd8', label: 'd8' },
  { value: 'd12', label: 'd12' }
]

export const weaponDieValues = ['d4', 'd6', 'd8', 'd12'] as const satisfies readonly WeaponDie[]

export const wearSlotOptions: readonly Option<WearSlot>[] = [
  { value: 'torso', label: 'Tronco' },
  { value: 'head', label: 'Cabeça' }
]

export const wearSlotValues = ['torso', 'head'] as const satisfies readonly WearSlot[]

export const armorBonusOptions: readonly Option<'0' | '1' | '2' | '3'>[] = [
  { value: '0', label: '0 — Sem proteção' },
  { value: '1', label: '1 — Proteção leve' },
  { value: '2', label: '2 — Proteção significativa' },
  { value: '3', label: '3 — Proteção muito alta' }
]

export const armorBonusValues = ['0', '1', '2', '3'] as const

/** Mirrors the item rules of the engine: every item has the same durability; slots are capped. */
export const itemLimits = {
  durability: 6,
  maxSlots: 99,
  inventoryCapacity: 12
} as const

export function labelOf<TValue extends string>(
  options: readonly Option<TValue>[],
  value: TValue | null | undefined
): string {
  return options.find((option) => option.value === value)?.label ?? ''
}
