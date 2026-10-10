import type { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import type {
  GameContext,
  INpcRegistry,
  PartySnapshot,
  WorldBrief
} from '../../mastra/context/game.context'

/** Upper bound of model/tool steps in one turn: narrator, delegation to a specialist, narrator. */
const MAX_STEPS_PER_TURN = 10

export interface NarratorTurn {
  worldId: string
  world: WorldBrief
  party: PartySnapshot
  npcRegistry: INpcRegistry
  message: string
}

export interface CampaignMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: Date
}

export interface INarratorGateway {
  /** Plays one turn of the campaign of a world and returns what the narrator says to the player. */
  narrate(turn: NarratorTurn): Promise<string>
  /** Everything the player and the narrator said in the campaign of a world, oldest first. */
  listMessages(worldId: string): Promise<CampaignMessage[]>
}

/**
 * Facade over Mastra for the narrator agent. Every message is stored with the world id as the
 * Mastra `resource` and a single campaign `thread` per world, so the whole conversation (and what
 * Observational Memory distilled from it) can be recovered from the world id alone.
 */
export class NarratorGateway implements INarratorGateway {
  constructor(private readonly loadMastra: () => Promise<Mastra>) {}

  async narrate({ worldId, world, party, npcRegistry, message }: NarratorTurn): Promise<string> {
    const narrator = (await this.loadMastra()).getAgent('narrator')

    const requestContext = new RequestContext<GameContext>()
    requestContext.set('worldId', worldId)
    requestContext.set('world', world)
    requestContext.set('party', party)
    requestContext.set('npcRegistry', npcRegistry)

    const result = await narrator.generate(message, {
      requestContext,
      maxSteps: MAX_STEPS_PER_TURN,
      memory: {
        resource: worldId,
        thread: { id: campaignThreadId(worldId), title: world.name, metadata: { worldId } }
      }
    })

    return result.text
  }

  async listMessages(worldId: string): Promise<CampaignMessage[]> {
    const memory = await (await this.loadMastra()).getAgent('narrator').getMemory()
    if (!memory) return []

    const { messages } = await memory.recall({
      threadId: campaignThreadId(worldId),
      resourceId: worldId,
      perPage: false
    })

    // Tool calls and reports of specialists are plumbing; the player only sees the dialogue.
    return messages.flatMap((stored) => {
      if (stored.role !== 'user' && stored.role !== 'assistant') return []

      const text = stored.content.parts
        .flatMap((part) => (part.type === 'text' ? [part.text] : []))
        .join('')
        .trim()

      return text ? [{ id: stored.id, role: stored.role, text, createdAt: stored.createdAt }] : []
    })
  }
}

/** One campaign per world for now; a session-per-thread model only needs a new id scheme here. */
function campaignThreadId(worldId: string): string {
  return `campaign-${worldId}`
}
