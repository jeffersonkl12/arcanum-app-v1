/** The party is a small group around the player, not an army: the player plus a few companions. */
export const PARTY_LIMITS = {
  /** Most members at once, the player's character included. */
  maxMembers: 6,
  /** Most NPCs among them (the player takes the sixth place). */
  maxNpcs: 5
} as const
