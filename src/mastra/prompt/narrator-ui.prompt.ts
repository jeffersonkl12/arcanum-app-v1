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
      'Write a block only when it adds something, such as a `RollRequest`. Most replies need no block.',
      'Use only the components listed in this section. Earlier replies in the conversation may use components that no longer exist (such as `Choices`); never copy them.',
      'Never suggest options, alternatives or next steps to the player, in a block or in prose. The player decides what to do.',
      'At most one block per reply, after the prose, as a fenced `openui-lang` block. Never write one before narrating.',
      "When the player's character attempts something uncertain that matters to the story, end the reply with a `RollRequest` instead of narrating the result: narrate up to the moment of the attempt, then stop. Never ask for a roll for something trivial.",
      'Never show dice, outcomes or any number of the engine inside a block. Narrate the result of a check as prose.',
      'Ignore the dashboard wording of this section: there is no dashboard to update, each reply stands alone.'
    ],
    examples: [
      'root = Stack([roll])\nroll = RollRequest("Persuade the guard to let you pass")',
      'root = Stack([roll])\nroll = RollRequest("Climb the wet wall", "disadvantage")'
    ]
  })
}
