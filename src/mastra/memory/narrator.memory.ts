import type { MastraDBMessage } from '@mastra/core/agent/message-list'
import type { RequestContext } from '@mastra/core/request-context'
import { Memory } from '@mastra/memory'
// Relative on purpose: the Mastra CLI that also loads this folder does not resolve the aliases.
import { stripNarrationUi } from '../../main/util/narration.util'
import type { GameContext } from '../context/game.context'

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
 *
 * The narrator may write UI blocks (OpenUI Lang) after its prose. They are presentation, not story:
 * the Observer would spend tokens on `RollRequest(...)` and could record a pending roll as if the player
 * had made it. The messages stay untouched in storage (the history shows the blocks); only
 * the copy the Observer reads loses them.
 */
export const narratorMemory = new Memory({
  options: {
    observationalMemory: {
      // The cheap model of the player's provider, with the key saved in the app.
      model: ({ requestContext }) =>
        (requestContext as RequestContext<GameContext>).get('helperModel'),
      // Keep the campaign going if the summarizer model has a bad moment: the messages stay
      // pending and are observed on a later cycle instead of failing the player's turn.
      observation: { failurePolicy: 'continue' },
      reflection: { failurePolicy: 'continue' },
      hooks: { beforeObservation: ({ messages }) => withoutUiBlocks(messages) }
    }
  }
})

/**
 * What the Observer reads: the same messages with the narrator's UI blocks taken out of their text.
 * Returns `undefined` when nothing changed, which tells Mastra to keep the messages as they are.
 */
function withoutUiBlocks(messages: MastraDBMessage[]): { messages: MastraDBMessage[] } | undefined {
  let changed = false
  const result: MastraDBMessage[] = []

  for (const message of messages) {
    if (message.role !== 'assistant') {
      result.push(message)
      continue
    }

    const parts: MastraDBMessage['content']['parts'] = []
    for (const part of message.content.parts) {
      if (part.type !== 'text' || !part.text.includes('```')) {
        parts.push(part)
        continue
      }

      const text = stripNarrationUi(part.text)
      if (text === part.text) parts.push(part)
      else {
        changed = true
        if (text) parts.push({ ...part, text })
      }
    }

    // A reply that was only a block has nothing left for the Observer to read.
    if (parts.length > 0) result.push({ ...message, content: { ...message.content, parts } })
  }

  return changed ? { messages: result } : undefined
}
