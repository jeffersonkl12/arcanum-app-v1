import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
// Pure constants of the engine, imported by relative path (see `game.context.ts`).
import { ACTOR_ATTRIBUTES } from '../../main/constant/actor-attribute.constant'
import { ROLL_MODES } from '../../main/constant/roll-mode.constant'
import { checkResultSchema, gameContextSchema } from '../context/game.context'

export const rollCheckTool = createTool({
  id: 'roll-check',
  description:
    'Rolls a check for an actor through the game engine when an action has an uncertain outcome ' +
    'that matters to the story. The actor rolls one d6 per point of the chosen attribute (one more ' +
    'with `advantage`, one fewer with `disadvantage`); a 5 or 6 on any die is a `success`, ' +
    'otherwise it is a `failure`. Returns the dice and the `outcome`. Narrate exactly that ' +
    'outcome; never roll again to get a better one. If `ok=false`, the `reason` says what to fix.',
  inputSchema: z.object({
    actorId: z
      .uuid()
      .describe(
        'Id of the actor who attempts the action (from the party section or the result of `create-npc`).'
      ),
    attribute: z
      .enum(ACTOR_ATTRIBUTES)
      .describe(
        'The attribute the action depends on: `strength` for force, `dexterity` for agility and ' +
          'precision, `intelligence` for knowledge, reasoning and perception.'
      ),
    mode: z
      .enum(ROLL_MODES)
      .optional()
      .describe(
        'Use `advantage` when the circumstances clearly help the actor, `disadvantage` when ' +
          'they clearly hinder it, otherwise omit it (`normal`).'
      )
  }),
  outputSchema: z.object({
    ok: z.boolean(),
    result: checkResultSchema.optional(),
    reason: z.string().optional()
  }),
  requestContextSchema: gameContextSchema,
  execute: async (request, { requestContext }) => {
    const outcome = await requestContext
      .get('diceChecker')
      .check(requestContext.get('worldId'), request)

    return outcome.ok ? { ok: true, result: outcome.result } : { ok: false, reason: outcome.reason }
  }
})
