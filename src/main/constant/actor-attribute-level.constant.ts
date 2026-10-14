import type { ActorAttribute } from './actor-attribute.constant'

/**
 * How the narrator reads an attribute score (1 to 6). The default score, 4, is an average person;
 * the words describe a trait without humiliating it, so a low score is not a verdict of inability.
 * Index 0 is score 1.
 */
export const ACTOR_ATTRIBUTE_LEVELS = {
  strength: ['frail', 'weak', 'slight', 'average', 'strong', 'mighty'],
  dexterity: ['clumsy', 'awkward', 'stiff', 'average', 'agile', 'exceptionally agile'],
  intelligence: ['very dull', 'slow', 'somewhat slow', 'average', 'sharp', 'brilliant']
} as const satisfies Record<ActorAttribute, readonly string[]>
