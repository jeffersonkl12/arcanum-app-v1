// Single place to swap the fixed models. Names verified against the Mastra provider registry
// (`.claude/skills/mastra/scripts/provider-registry.mjs --provider google`). The narrator is not
// here: the player picks its provider, model and temperature (see `ai_setting`), the same for every world.

/** Specialist that fills a structured form; a cheaper model is enough. */
export const NPC_CREATOR_MODEL = 'google/gemini-3.5-flash-lite'

/** Background model of Observational Memory (the summarization of old messages). */
export const MEMORY_MODEL = 'google/gemini-2.5-flash'
