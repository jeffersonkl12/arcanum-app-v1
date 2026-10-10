export const ACTOR_GENDERS = ['male', 'female'] as const

export type ActorGender = (typeof ACTOR_GENDERS)[number]
