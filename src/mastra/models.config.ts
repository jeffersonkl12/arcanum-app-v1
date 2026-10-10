// Single place to swap models. Names verified against the Mastra provider registry
// (`.claude/skills/mastra/scripts/provider-registry.mjs --provider google`).

/** Main model: the narrator talks to the player, so it gets the best prose. */
export const NARRATOR_MODEL = 'google/gemini-3.5-flash'

/** Specialist that fills a structured form; a cheaper model is enough. */
export const NPC_CREATOR_MODEL = 'google/gemini-3.5-flash-lite'

/** Background model of Observational Memory (the summarization of old messages). */
export const MEMORY_MODEL = 'google/gemini-2.5-flash'
