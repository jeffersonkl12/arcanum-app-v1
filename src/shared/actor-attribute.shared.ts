/** The attributes every actor has; each score is the number of d6 a check with it rolls. */
export const ACTOR_ATTRIBUTES = ['strength', 'dexterity', 'intelligence'] as const

export type ActorAttribute = (typeof ACTOR_ATTRIBUTES)[number]
