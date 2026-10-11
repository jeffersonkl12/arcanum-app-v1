import { z } from 'zod'
import { ROLL_MODES } from './roll-mode.shared'

/** Component every narrator UI block starts from (`root = Stack(...)`). */
export const NARRATOR_UI_ROOT = 'Stack'

export interface NarratorUiComponentSpec {
  name: string
  description: string
  props: z.ZodObject
}

/**
 * Vocabulary of the UI the narrator may write in OpenUI Lang, without any Vue: name, description
 * and props of each component. Both sides build from it, so they cannot drift apart: main turns it
 * into the narrator's prompt (`src/mastra`), and the renderer maps each name to a Vue component
 * for `createLibrary`. A name the renderer has no component for would show up as
 * `unknown-component`, so add the component to both sides in the same change.
 *
 * Nothing here shows a dice result or a number from the engine on purpose: a block is text the
 * model wrote, and the model must never be the source of a roll. `RollRequest` only asks for one:
 * the roll itself and its outcome belong to the engine.
 */
export const NARRATOR_UI_COMPONENTS: readonly NarratorUiComponentSpec[] = [
  {
    name: NARRATOR_UI_ROOT,
    description: 'Vertical container of the other components of the block',
    props: z.object({
      children: z.array(z.any()).describe('The components to show, in order')
    })
  },
  {
    name: 'Choices',
    description:
      'Short actions the player may take next. They are suggestions: the player can always do something else',
    props: z.object({
      options: z
        .array(z.string())
        .describe('2 to 4 actions, a few words each, in the player language')
    })
  },
  {
    name: 'RollRequest',
    description:
      'Asks the player to roll the dice for a check. The player clicks a button, the dice roll on their screen, the game engine resolves the check, and the outcome comes back as the next player message. You choose only what is at stake and the mode; the dice shown on the button come from the mode',
    props: z.object({
      label: z
        .string()
        .describe(
          'What is at stake, a few words, in the player language (e.g. "Persuade the guard")'
        ),
      mode: z
        .enum(ROLL_MODES)
        .optional()
        .describe(
          '`advantage` when the circumstances clearly help the character, `disadvantage` when they clearly hinder it; omit it otherwise'
        )
    })
  }
]

/** Something wrong with a UI block the narrator wrote, as the OpenUI parser reports it. */
export interface NarrationIssue {
  /** Parser code, e.g. `unknown-component` or `missing-required`. */
  code: string
  message: string
  component?: string
}

/**
 * A narrator reply, split in the order it was written. Prose is for the chat bubble; a `ui` block is
 * OpenUI Lang source (without the markdown fence) for the renderer's `<Renderer>`. The parser is
 * permissive, so a block with `issues` may still render in part: the renderer decides what to show.
 */
export type NarrationSegment =
  { type: 'prose'; text: string } | { type: 'ui'; source: string; issues: NarrationIssue[] }

export type NarrationSegmentKind = NarrationSegment['type']

/** New text of the segment at position `segment` of the reply being written; append it. */
export interface NarrationDeltaEvent {
  type: 'delta'
  segment: number
  kind: NarrationSegmentKind
  text: string
}

/** The reply is complete: `text` is the raw reply (what the history stores), `segments` its parts. */
export interface NarrationDoneEvent {
  type: 'done'
  text: string
  segments: NarrationSegment[]
}
