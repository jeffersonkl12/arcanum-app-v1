/** Maximum lengths of the free-text fields of the entities. */
export const TEXT_LIMITS = {
  name: 120,
  shortText: 120,
  // World, item and place descriptions. Actor texts have their own limits (`ACTOR_TEXT_LIMITS`).
  description: 500,
  longText: 5000
} as const
