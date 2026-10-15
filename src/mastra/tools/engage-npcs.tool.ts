import { createTool } from '@mastra/core/tools'
import { NPC_SCENE } from '../../main/constant/npc-scene.constant'
import { gameContextSchema } from '../context/game.context'
import { npcEngageResultSchema, npcSceneIdsSchema } from '../context/npc-scene.context'

export const engageNpcsTool = createTool({
  id: 'engage-npcs',
  description:
    'Brings NPCs into the scene: from now on their whole sheet (profile, background, health, ' +
    'attributes, money, items and what they feel about the party) is in your prompt, and it is ' +
    'refreshed every turn. Call it when an NPC starts to talk or interact with the player or the ' +
    'party, or is about to matter, before narrating what they say or do. NPCs that are only in ' +
    'the place do not need it: their short sheet is already in the world section. Each result ' +
    'also returns the sheet right away. They leave the scene by themselves after a few turns ' +
    `without the player mentioning them (up to ${NPC_SCENE.maxActive} at once; one more makes ` +
    'the one engaged for longest leave), and `release-npcs` takes them out earlier. Party ' +
    'members are already fully in the prompt and are refused. Engaging again an NPC already ' +
    'engaged keeps them in the scene. Batch every NPC of the moment in one call.',
  inputSchema: npcSceneIdsSchema,
  outputSchema: npcEngageResultSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ npcIds }, { requestContext }) =>
    requestContext.get('npcSceneRegistry').engage(requestContext.get('worldId'), npcIds)
})
