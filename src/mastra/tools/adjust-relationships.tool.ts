import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { gameContextSchema } from '../context/game.context'
import {
  MAX_RELATIONSHIP_CHANGES_PER_CALL,
  relationshipChangeSchema,
  relationshipOutcomeSchema
} from '../context/relationship.context'

export const adjustRelationshipsTool = createTool({
  id: 'adjust-relationships',
  description:
    'Changes how much one actor feels about another after an interaction between them, between the ' +
    "player's character and an NPC or between two NPCs. Use it whenever an interaction is relevant " +
    'to the bond, good or bad: secrets shared, revelations, betrayals, lies, insults, threats, ' +
    'favors, gifts, rescues, quarrels, a drink or a laugh together. Even small things count, with a ' +
    'slight `shift`; pick the one that fits the kind and the weight of the interaction (the engine ' +
    'decides the number). A feeling is directed (what A feels about B is not what B feels about ' +
    'A), so when both sides are affected make one change for each, with the `shift` that fits that side. Do not use it for routine ' +
    'contact with no weight. All changes of a scene go in a single call. Returns one result per ' +
    'change, in order, with the band before and after (e.g. neutral to friendly) and the value now.',
  inputSchema: z.object({
    changes: z.array(relationshipChangeSchema).min(1).max(MAX_RELATIONSHIP_CHANGES_PER_CALL)
  }),
  outputSchema: z.object({ results: z.array(relationshipOutcomeSchema) }),
  requestContextSchema: gameContextSchema,
  execute: async ({ changes }, { requestContext }) => ({
    results: await requestContext
      .get('relationshipRegistry')
      .adjust(requestContext.get('worldId'), changes)
  })
})
