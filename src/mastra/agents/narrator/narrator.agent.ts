import { Agent } from '@mastra/core/agent'
import { gameContextSchema, type GameContext } from '../../context/game.context'
import { narratorMemory } from '../../memory/narrator.memory'
import { layeredInstructions } from '../../prompt/compose.prompt'
import { dynamicLayer, generatedLayer, staticLayer } from '../../prompt/layer.prompt'
import { narratorUiPrompt } from '../../prompt/narrator-ui.prompt'
import { adjustRelationshipsTool } from '../../tools/adjust-relationships.tool'
import { createItemsTool } from '../../tools/create-items.tool'
import { deleteItemsTool } from '../../tools/delete-items.tool'
import { equipItemsTool } from '../../tools/equip-items.tool'
import { findItemsTool } from '../../tools/find-items.tool'
import { getInventoryTool } from '../../tools/get-inventory.tool'
import { recallMemoriesTool } from '../../tools/recall-memories.tool'
import { rememberEventsTool } from '../../tools/remember-events.tool'
import { rollCheckTool } from '../../tools/roll-check.tool'
import { transferCoinsTool } from '../../tools/transfer-coins.tool'
import { transferItemsTool } from '../../tools/transfer-items.tool'
import { updateItemsTool } from '../../tools/update-items.tool'
import { npcCreatorAgent } from '../npc-creator/npc-creator.agent'

const AGENT = 'narrator'

/**
 * System prompt of the narrator, from highest to lowest priority. The static layers come first and
 * never change, which keeps the start of the prompt cacheable; the dynamic ones follow, ordered
 * from the state that changes least to the one that changes most. Files live next to this one.
 */
const layers = [
  staticLayer(AGENT, 'identity'),
  staticLayer(AGENT, 'rules'),
  staticLayer(AGENT, 'formatting'),
  generatedLayer('ui', narratorUiPrompt),
  dynamicLayer(AGENT, 'world', (context: GameContext) => context.world),
  dynamicLayer(AGENT, 'party', (context: GameContext) => context.party),
  // Last: it changes the most, and the end of the prompt is one of the two places the model weighs most.
  dynamicLayer(AGENT, 'live-context', (context: GameContext) => ({ sections: context.liveContext }))
]

/**
 * The game master the player talks to. It is the supervisor: it delegates to specialists as if they
 * were tools, receives their result, and is always the one that answers the player.
 */
export const narratorAgent = new Agent({
  id: 'narrator',
  name: 'Narrator',
  description: 'The AI game master: narrates the story and answers the player.',
  instructions: layeredInstructions(layers),
  // Chosen by the player for each world and read from the database by the main process.
  model: ({ requestContext }) => requestContext.get('narratorModel'),
  agents: { npcCreator: npcCreatorAgent },
  tools: {
    rollCheckTool,
    adjustRelationshipsTool,
    createItemsTool,
    updateItemsTool,
    deleteItemsTool,
    transferItemsTool,
    transferCoinsTool,
    equipItemsTool,
    getInventoryTool,
    findItemsTool,
    rememberEventsTool,
    recallMemoriesTool
  },
  requestContextSchema: gameContextSchema,
  memory: narratorMemory
})
