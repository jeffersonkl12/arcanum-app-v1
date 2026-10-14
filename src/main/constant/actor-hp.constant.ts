/**
 * Hit points of an actor. A character rolls 2d6 for the maximum, so it goes from 2 to 12 and
 * never beyond. The defaults are what the engine gives a new actor that does not say: the average
 * of 2d6.
 */
export const ACTOR_HP = {
  minMax: 2,
  max: 12,
  defaultPlayer: 7,
  defaultNpc: 7
} as const
