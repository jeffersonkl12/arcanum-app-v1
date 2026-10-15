import { createTool } from '@mastra/core/tools'
import { gameContextSchema } from '../context/game.context'
import { npcReleaseResultSchema, npcSceneIdsSchema } from '../context/npc-scene.context'

export const releaseNpcsTool = createTool({
  id: 'release-npcs',
  description:
    'Takes NPCs out of the scene once they stop interacting with the player and the party: they ' +
    'leave, the conversation ends, the player walks away. Their whole sheet leaves the prompt ' +
    'from the next turn on (they keep their short sheet in the world section while they are in ' +
    'the place). An NPC that was not engaged is ignored.',
  inputSchema: npcSceneIdsSchema,
  outputSchema: npcReleaseResultSchema,
  requestContextSchema: gameContextSchema,
  execute: async ({ npcIds }, { requestContext }) =>
    requestContext.get('npcSceneRegistry').release(requestContext.get('worldId'), npcIds)
})
