/**
 * Hit points of an actor. `max` is a ceiling so a typo cannot make a character unkillable; the
 * defaults are what the engine gives a new actor that does not say (the player is sturdier).
 */
export const ACTOR_HP = {
  minMax: 1,
  max: 9999,
  defaultPlayer: 40,
  defaultNpc: 20
} as const
