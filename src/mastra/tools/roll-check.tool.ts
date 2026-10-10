import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
// Pure constant of the engine, imported by relative path (see `game.context.ts`).
import { ROLL_MODES } from '../../main/constant/roll-mode.constant'
import { checkResultSchema, gameContextSchema } from '../context/game.context'

export const rollCheckTool = createTool({
  id: 'roll-check',
  description:
    'Rolls a check through the game engine when an action has an uncertain outcome that matters ' +
    'to the story. The engine rolls 2d6 (`normal`), 3d6 (`advantage`) or 1d6 (`disadvantage`) and ' +
    'reads the outcome from the highest die. Returns the dice and the `outcome` ' +
    '(critical_failure, failure, success or critical_success). Narrate exactly that outcome; ' +
    'never roll again to get a better one.',
  inputSchema: z.object({
    mode: z
      .enum(ROLL_MODES)
      .optional()
      .describe(
        'Use `advantage` when the circumstances clearly help the character, `disadvantage` when ' +
          'they clearly hinder it, otherwise omit it (`normal`).'
      )
  }),
  outputSchema: checkResultSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ mode }, { requestContext }) => requestContext.get('diceChecker').check(mode)
})
