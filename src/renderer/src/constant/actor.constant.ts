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

/** Mirrors ACTOR_HP in the engine: the range of the maximum health and what a new actor gets. */
export const actorHpLimits = {
  minMax: 1,
  max: 9999,
  defaultPlayer: 40,
  defaultNpc: 20
} as const
