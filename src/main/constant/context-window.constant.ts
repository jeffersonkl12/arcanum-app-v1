/** How long a piece of dynamic context stays in the prompt without being used. */
export const CONTEXT_TTL = {
  /** Turns an entry survives without being used; using it gives them all back. */
  defaultTurns: 8,
  /** Most entries that can expire held at once; past it, the ones closest to expiring go first. */
  maxExpiring: 40
} as const

/** `ttlTurns` of an entry that never leaves the prompt. */
export const CONTEXT_TTL_PINNED = Number.POSITIVE_INFINITY
