/** Mirrors TEXT_LIMITS in the engine: the length of the world, item and place descriptions. */
export const descriptionMaxLength = 500

/** Mirrors DOCUMENT_LIMITS in the engine: the fields of a world document. */
export const documentLimits = { subject: 120, category: 60, content: 1000 } as const
