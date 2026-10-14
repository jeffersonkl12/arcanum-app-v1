/**
 * How much one actor feels about another, from -100 (bitter hatred) to 100 (total devotion). It is
 * directed: what A feels about B is not what B feels about A. Two actors with no stored value are
 * neutral (`default`).
 */
export const RELATIONSHIP_LIMITS = {
  min: -100,
  max: 100,
  default: 0
} as const

/**
 * The sizes of a change the AI can pick, named by direction and size, so it classifies an
 * interaction and the engine decides the number. The ladder is symmetric: a `*_loss` moves as much as
 * the `*_gain` of the same size. The largest step (35) is on purpose below the range of the scale:
 * going from enemy to ally takes several interactions, never one.
 */
export const RELATIONSHIP_SHIFT_NAMES = [
  'slight_gain',
  'small_gain',
  'moderate_gain',
  'large_gain',
  'major_gain',
  'slight_loss',
  'small_loss',
  'moderate_loss',
  'large_loss',
  'major_loss'
] as const

export type RelationshipShift = (typeof RELATIONSHIP_SHIFT_NAMES)[number]

/** How much each size moves the value, and the kind of interaction it is meant for (shown to the AI). */
export const RELATIONSHIP_SHIFTS = {
  slight_gain: { delta: 2, example: 'a drink together, a kind word, a shared laugh' },
  small_gain: { delta: 5, example: 'a small favor, a pleasant talk, a minor gift' },
  moderate_gain: { delta: 10, example: 'a real favor, a shared secret, defending the other' },
  large_gain: { delta: 20, example: 'a serious revelation, a costly sacrifice, a rescue' },
  major_gain: { delta: 35, example: 'saving a life, a bond that changes for good' },
  slight_loss: { delta: -2, example: 'a rude remark, a small slight, a broken minor promise' },
  small_loss: { delta: -5, example: 'an insult, a lie, mockery in public' },
  moderate_loss: { delta: -10, example: 'a threat, a betrayed trust, a serious quarrel' },
  large_loss: { delta: -20, example: 'a real betrayal, violence, a grave offense' },
  major_loss: { delta: -35, example: 'attempted murder, a betrayal that cannot be forgiven' }
} as const satisfies Record<RelationshipShift, { delta: number; example: string }>

/** Most changes one batch call takes, so a single call cannot flood the engine or the context. */
export const MAX_RELATIONSHIP_CHANGES_PER_CALL = 20

/**
 * The bands the value falls into, from the worst to the best. `from` is the lowest value of the band
 * (the band runs up to the `from` of the next one); `meaning` is how the narrator should read it.
 */
export const RELATIONSHIP_LEVELS = [
  { level: 'nemesis', from: -100, meaning: 'sworn enemy: wishes the other harm and acts on it' },
  { level: 'enemy', from: -75, meaning: 'hostile: openly against the other' },
  { level: 'unfriendly', from: -40, meaning: 'cold and distrustful, helps only if forced' },
  { level: 'neutral', from: -10, meaning: 'indifferent: neither for nor against' },
  { level: 'friendly', from: 10, meaning: 'warm and well-disposed, glad to help' },
  { level: 'ally', from: 40, meaning: 'trusted friend, takes risks for the other' },
  { level: 'devoted', from: 75, meaning: 'loyal to the end, would give up much for the other' }
] as const

export type RelationshipLevel = (typeof RELATIONSHIP_LEVELS)[number]['level']
