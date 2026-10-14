/** What kind of event a character memory records. It describes the memory; it is not searched on. */
export const MEMORY_KINDS = [
  'betrayal',
  'revelation',
  'secret',
  'promise',
  'conflict',
  'favor',
  'bond',
  'shared_moment',
  'loss',
  'other'
] as const

export type MemoryKind = (typeof MEMORY_KINDS)[number]

/**
 * How much a memory weighs, from a loaf of bread (1) to a betrayal that defines a relationship (5).
 * It ranks the semantic search and decides how long the memory stays in the prompt; a memory at
 * `pinned` is never dropped from it.
 */
export const MEMORY_IMPORTANCE = {
  min: 1,
  max: 5,
  pinned: 5
} as const

export const MEMORY_LIMITS = {
  /** Characters of the summary: enough for the idea, short enough to be listed ten at a time. */
  summary: 280,
  /** Characters of a search query. */
  query: 300,
  /** Actors who can share one memory. */
  actors: 8,
  /** Memories one `remember` call takes. */
  perCall: 5,
  /** Most recent memories of the campaign, listed on every turn. */
  recent: 10,
  /** Memories at `MEMORY_IMPORTANCE.pinned` listed on every turn (the newest, if there are more). */
  pinned: 20,
  /** Memories the automatic search puts in the prompt for a player message. */
  recalled: 5,
  /** Most memories one `recall` call returns. */
  recallMax: 10
} as const

/**
 * Tuning of the semantic search. These are starting points for `text-embedding-3-small`, not
 * measured values: revisit them with real campaigns.
 */
export const MEMORY_SEARCH = {
  /** Cosine similarity below which the automatic search stays quiet instead of guessing. */
  automaticMinSimilarity: 0.35,
  /** The AI asks on purpose when it calls `recall`, so it gets looser matches. */
  deliberateMinSimilarity: 0.2,
  /** Cosine similarity from which a new memory is the same event as a stored one. */
  duplicateSimilarity: 0.92,
  /** Weight of importance in the ranking: a max-importance memory gains this much similarity. */
  importanceWeight: 0.15,
  /** Candidates fetched per memory wanted, so ranking by importance has something to choose from. */
  candidatesPerResult: 4
} as const

/** Turns a memory of each importance stays in the prompt without being used. */
export const MEMORY_TTL_TURNS: Readonly<Record<number, number>> = {
  1: 8,
  2: 8,
  3: 8,
  4: 16
}
