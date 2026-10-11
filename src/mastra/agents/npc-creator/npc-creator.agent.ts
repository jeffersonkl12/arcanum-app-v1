import { Agent } from '@mastra/core/agent'
import { gameContextSchema, type GameContext } from '../../context/game.context'
import { layeredInstructions } from '../../prompt/compose.prompt'
import { dynamicLayer } from '../../prompt/layer.prompt'
import { createItemsTool } from '../../tools/create-items.tool'
import { createNpcTool } from '../../tools/create-npc.tool'

const AGENT = 'npc-creator'

/**
 * A single layer for now. It is dynamic because the world (genre and description) shapes every NPC
 * it creates; more layers are added here as the agent grows.
 */
const layers = [
  dynamicLayer(AGENT, 'npc-creator', (context: GameContext) => ({ world: context.world }))
]

/**
 * Specialist called by the narrator, never by the player. It creates NPCs and reports back; it does
 * not narrate. The narrator keeps control of the conversation the whole time.
 */
export const npcCreatorAgent = new Agent({
  id: 'npc-creator',
  name: 'NPC Creator',
  description:
    'Creates and registers NPCs in the world, together with the items they carry and wear. Give it ' +
    'who the NPC is and what role it plays in the scene (it can invent the missing details), and ' +
    'say what it should carry or wield if the scene needs it. Returns the registered NPC with its ' +
    'id and its items. Use it whenever a new named character appears; it does not narrate.',
  instructions: layeredInstructions(layers),
  // The cheap model of the player's provider, with the key saved in the app.
  model: ({ requestContext }) => requestContext.get('helperModel'),
  // Items are created already in the NPC's inventory and equipped (`ownerId` + `equip`), so it
  // needs nothing else: moving or removing items afterwards is the narrator's job.
  tools: { createNpcTool, createItemsTool },
  requestContextSchema: gameContextSchema
  // No memory of its own: Mastra gives each delegation a fresh thread under the resource
  // `{worldId}-npcCreator` and saves only the delegation prompt and this agent's report there.
})
