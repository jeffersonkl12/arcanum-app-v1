export const ACTOR_AGES = [
  'baby',
  'child',
  'adolescent',
  'young_adult',
  'middle_aged',
  'old',
  'elder'
] as const

export type ActorAge = (typeof ACTOR_AGES)[number]
