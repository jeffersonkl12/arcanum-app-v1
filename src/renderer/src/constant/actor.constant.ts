import type { CreateActor } from '@schema'

export const actorAgeValues = [
  'baby',
  'child',
  'adolescent',
  'young_adult',
  'middle_aged',
  'old',
  'elder'
] as const satisfies readonly CreateActor['age'][]

export const actorGenderValues = [
  'male',
  'female'
] as const satisfies readonly CreateActor['gender'][]

export interface ActorAgeOption {
  value: (typeof actorAgeValues)[number]
  label: string
}

export interface ActorGenderOption {
  value: (typeof actorGenderValues)[number]
  label: string
}

export const actorAgeOptions: readonly ActorAgeOption[] = [
  { value: 'baby', label: 'Bebê' },
  { value: 'child', label: 'Criança' },
  { value: 'adolescent', label: 'Adolescente' },
  { value: 'young_adult', label: 'Jovem adulto' },
  { value: 'middle_aged', label: 'Meia-idade' },
  { value: 'old', label: 'Idoso' },
  { value: 'elder', label: 'Ancião' }
]

export const actorGenderOptions: readonly ActorGenderOption[] = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' }
]

/** Mirrors ACTOR_ATTRIBUTE_LIMITS in the engine: the range of a score and what an actor gets. */
export const actorAttributeLimits = {
  min: 1,
  max: 20,
  default: 10
} as const

export const actorAttributeKeys = [
  'strength',
  'dexterity',
  'intelligence'
] as const satisfies readonly (keyof CreateActor)[]

export type ActorAttributeKey = (typeof actorAttributeKeys)[number]

export interface ActorAttributeOption {
  key: ActorAttributeKey
  label: string
}

export const actorAttributeOptions: readonly ActorAttributeOption[] = [
  { key: 'strength', label: 'Força' },
  { key: 'dexterity', label: 'Destreza' },
  { key: 'intelligence', label: 'Inteligência' }
]

/**
 * How a character made from scratch is rolled: each attribute is the sum of 3d6, and the maximum
 * health is 1d6.
 */
export const actorRollRules = {
  attributeDice: 3,
  hitPointDice: 1
} as const

export type ActorAttributes =Record<ActorAttributeKey, number>

/** Mirrors ACTOR_HP in the engine: the range of the maximum health and what a new actor gets. */
export const actorHpLimits = {
  minMax: 1,
  max: 9999,
  defaultPlayer: 40,
  defaultNpc: 20
} as const

/** Mirrors ACTOR_COIN_LIMITS in the engine: the range of an amount of coins and what an actor gets. */
export const actorCoinLimits = {
  min: 0,
  max: 999_999_999,
  default: 0
} as const

export const actorCoinKeys = [
  'goldPieces',
  'silverPieces',
  'bronzePieces'
] as const satisfies readonly (keyof CreateActor)[]

export type ActorCoinKey = (typeof actorCoinKeys)[number]

export interface ActorCoinOption {
  key: ActorCoinKey
  label: string
}

export const actorCoinOptions: readonly ActorCoinOption[] = [
  { key: 'goldPieces', label: 'Peça de ouro' },
  { key: 'silverPieces', label: 'Peça de prata' },
  { key: 'bronzePieces', label: 'Peça de bronze' }
]

export type ActorCoins = Record<ActorCoinKey, number>
