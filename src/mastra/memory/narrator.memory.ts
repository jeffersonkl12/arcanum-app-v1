import { Memory } from '@mastra/memory'
import { MEMORY_MODEL } from '../models.config'

/**
 * Conversation memory of the narrator, stored in the Mastra storage (LibSQL).
 *
 * Callers must pass `memory: { resource: worldId, thread: <campaign thread> }`, which is what ties
 * every message and observation to a world and lets the history be recovered later.
 *
 * Observational Memory is the summarization: when unobserved messages pass the threshold, a
 * background Observer compresses them into a dense log and a Reflector keeps that log bounded. The
 * prompt stays small and cacheable however long the campaign runs. `lastMessages` is left at the
 * default on purpose; Mastra manages the history itself when Observational Memory is on.
 */
export const narratorMemory = new Memory({
  options: {
    observationalMemory: {
      model: MEMORY_MODEL,
      // Keep the campaign going if the summarizer model has a bad moment: the messages stay
      // pending and are observed on a later cycle instead of failing the player's turn.
      observation: { failurePolicy: 'continue' },
      reflection: { failurePolicy: 'continue' }
    }
  }
})
