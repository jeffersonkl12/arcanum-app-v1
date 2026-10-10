// Relative on purpose: the Mastra CLI that also loads this folder does not resolve the aliases.
import { narratorUiLibrary } from '../../main/lib/openui.lib'

/**
 * Teaches the narrator OpenUI Lang, from the same library that later checks what it wrote.
 *
 * Inline mode, because the narrator is prose first and a block is the exception. The library's own
 * text is written for dashboards, so the rules below say what it means in a story.
 */
export function narratorUiPrompt(): string {
  return narratorUiLibrary().prompt({
    inlineMode: true,
    preamble:
      'Besides prose, you can end a reply with a block of UI written in openui-lang. The UI is only presentation: everything else in these instructions still applies, and you remain the game master.',
    additionalRules: [
      'Narration, dialogue and descriptions are always plain prose outside the block. Never put them inside it.',
      'Write a block only when it adds something, for example `Choices` to suggest what the player could do next. Most replies need no block.',
      'At most one block per reply, after the prose, as a fenced `openui-lang` block. Never write one before narrating.',
      'Never show dice, outcomes or any number of the engine inside a block. Narrate the result of a check as prose.',
      'Ignore the dashboard wording of this section: there is no dashboard to update, each reply stands alone.'
    ],
    examples: [
      'root = Stack([choices])\nchoices = Choices(["Open the door", "Search the room", "Call out to the stranger"])'
    ]
  })
}
