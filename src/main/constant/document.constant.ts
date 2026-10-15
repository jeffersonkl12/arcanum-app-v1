/** Maximum lengths of the fields of a document. */
export const DOCUMENT_LIMITS = {
  /** Who or what the entry is about ("Casa Lobam"). */
  subject: 120,
  /** The aspect of the subject ("economia", "política"). */
  category: 60,
  /** Characters of the plain-text content: one fact-sized piece, short enough to embed on its own. */
  content: 500
} as const
