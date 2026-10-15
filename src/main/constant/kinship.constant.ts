/**
 * The direct bonds the player records between two actors. Everything else (siblings, grandparents,
 * uncles, cousins, in-laws...) is derived from these by the engine, so the family can never contradict
 * itself. A `parent` link goes from the parent to the child; a `spouse` link has no direction.
 */
export const KINSHIP_KINDS = ['parent', 'spouse'] as const

export type KinshipKind = (typeof KINSHIP_KINDS)[number]

/** What the relative is to the actor the player is looking at, when recording a bond. */
export const KINSHIP_INPUTS = ['parent', 'child', 'spouse'] as const

export type KinshipInput = (typeof KINSHIP_INPUTS)[number]

export const KINSHIP_LIMITS = {
  /** An actor has at most this many parents on record. */
  maxParents: 2,
  /** An actor has at most one spouse on record. */
  maxSpouses: 1
} as const

/** Every relation the engine can name between two actors, from the closest to the most distant. */
export const KINSHIP_RELATIONS = [
  'parent',
  'child',
  'spouse',
  'sibling',
  'half_sibling',
  'step_parent',
  'step_child',
  'grandparent',
  'grandchild',
  'uncle_aunt',
  'nibling',
  'cousin',
  'parent_in_law',
  'child_in_law',
  'sibling_in_law'
] as const

export type KinshipRelation = (typeof KINSHIP_RELATIONS)[number]
