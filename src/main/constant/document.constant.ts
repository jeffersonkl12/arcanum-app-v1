/** Maximum lengths of the fields of a document. */
export const DOCUMENT_LIMITS = {
  /** Who or what the entry is about ("Casa Lobam"). */
  subject: 120,
  /** The aspect of the subject ("economia", "política"). */
  category: 60,
  /** Characters of the plain-text content: one subject-sized piece, short enough to embed on its own. */
  content: 1000
} as const

/** How the embeddings of the documents are made. */
export const DOCUMENT_INDEX = {
  /** Documents embedded in one call when the ones missing an embedding are caught up. */
  batchSize: 64
} as const

/**
 * How the AI looks documents up. Starting points, not measured values: revisit them with real
 * campaigns.
 */
export const DOCUMENT_SEARCH = {
  /** Characters of a search query. */
  query: 300,
  /** Documents one search returns when the AI does not say how many. */
  defaultLimit: 5,
  /** Most documents one search returns. */
  maxLimit: 10,
  /** The AI asks on purpose, so it gets loose matches. */
  minSimilarity: 0.2,
  /** Documents the automatic search puts in the prompt for a player message. */
  automaticLimit: 3,
  /** Cosine similarity below which the automatic search stays quiet instead of guessing. */
  automaticMinSimilarity: 0.35,
  /** Most subjects the index lists; the rest is reachable by searching. */
  indexMax: 200
} as const
