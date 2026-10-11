import type { Agent, AgentExecutionOptions } from '@mastra/core/agent'
import type { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { validateNarratorUi } from '@lib/openui.lib'
import type { NarrationDeltaEvent, NarrationDoneEvent, NarrationSegment } from '@shared'
import { NarrationStreamSplitter, splitNarration } from '@util/narration.util'
import type {
  GameContext,
  IDiceChecker,
  INpcRegistry,
  PartySnapshot,
  WorldBrief
} from '../../mastra/context/game.context'

/** Upper bound of model/tool steps in one turn: narrator, tool or specialist, narrator. */
const MAX_STEPS_PER_TURN = 10

export interface NarratorTurn {
  worldId: string
  /** Mastra model id (`provider/model`) the narrator runs on in this turn. */
  model: `${string}/${string}`
  /** Cheap model of the same provider for the NPC creator and the memory summarizer. */
  helperModel: `${string}/${string}`
  /** Key saved in the app for the model's provider; `undefined` leaves Mastra to read the environment. */
  apiKey?: string
  temperature: number
  world: WorldBrief
  party: PartySnapshot
  npcRegistry: INpcRegistry
  diceChecker: IDiceChecker
  message: string
}

export interface CampaignMessage {
  id: string
  role: 'user' | 'assistant'
  /** The message as stored. For the narrator it can hold OpenUI Lang blocks; `segments` has them apart. */
  text: string
  /** `text` split into prose and UI blocks, the same way a streamed turn ends. */
  segments: NarrationSegment[]
  createdAt: Date
}

/**
 * What a streamed turn emits: the narration as the model writes it, already split into prose and UI
 * blocks, then the whole reply once, exactly as the history will return it, so a client can replace
 * what it accumulated.
 */
export type NarratorStreamEvent = NarrationDeltaEvent | NarrationDoneEvent

/** The agent and the options of one run, as `generate` and `stream` take them. */
interface PreparedRun {
  narrator: Agent
  options: AgentExecutionOptions
}

export interface INarratorGateway {
  /** Plays one turn of the campaign of a world and returns what the narrator says to the player. */
  narrate(turn: NarratorTurn): Promise<string>
  /**
   * Same turn as `narrate`, but the narration arrives as it is written. Rejects before the first
   * event if the turn cannot start; a failure later makes the iteration throw. The turn only
   * finishes (and is stored in the campaign) if the iteration is consumed to the end.
   */
  narrateStream(turn: NarratorTurn): Promise<AsyncIterable<NarratorStreamEvent>>
  /** Everything the player and the narrator said in the campaign of a world, oldest first. */
  listMessages(worldId: string): Promise<CampaignMessage[]>
  /** Forgets the campaign of a world: its messages and what Observational Memory distilled from them. */
  deleteCampaign(worldId: string): Promise<void>
}

/**
 * Facade over Mastra for the narrator agent. Every message is stored with the world id as the
 * Mastra `resource` and a single campaign `thread` per world, so the whole conversation (and what
 * Observational Memory distilled from it) can be recovered from the world id alone.
 */
export class NarratorGateway implements INarratorGateway {
  constructor(private readonly loadMastra: () => Promise<Mastra>) {}

  async narrate(turn: NarratorTurn): Promise<string> {
    const { narrator, options } = await this.prepareRun(turn)

    const result = await narrator.generate(turn.message, options)

    return result.text
  }

  async narrateStream(turn: NarratorTurn): Promise<AsyncIterable<NarratorStreamEvent>> {
    const { narrator, options } = await this.prepareRun(turn)

    return toNarratorEvents(await narrator.stream(turn.message, options))
  }

  /** Everything `generate` and `stream` share: the agent, the request context and the memory. */
  private async prepareRun({
    worldId,
    model,
    helperModel,
    apiKey,
    temperature,
    world,
    party,
    npcRegistry,
    diceChecker
  }: NarratorTurn): Promise<PreparedRun> {
    const narrator = (await this.loadMastra()).getAgent('narrator')

    const requestContext = new RequestContext<GameContext>()
    requestContext.set('worldId', worldId)
    requestContext.set('narratorModel', { id: model, apiKey })
    requestContext.set('helperModel', { id: helperModel, apiKey })
    requestContext.set('world', world)
    requestContext.set('party', party)
    requestContext.set('npcRegistry', npcRegistry)
    requestContext.set('diceChecker', diceChecker)

    const options = {
      requestContext,
      maxSteps: MAX_STEPS_PER_TURN,
      modelSettings: { temperature },
      memory: {
        resource: worldId,
        thread: { id: campaignThreadId(worldId), title: world.name, metadata: { worldId } }
      }
    }

    return { narrator, options }
  }

  async listMessages(worldId: string): Promise<CampaignMessage[]> {
    const memory = await (await this.loadMastra()).getAgent('narrator').getMemory()
    if (!memory) return []

    // The thread is created by the first turn, so a new campaign has no history yet (and `recall`
    // throws for a thread that does not exist).
    if (!(await memory.getThreadById({ threadId: campaignThreadId(worldId) }))) return []

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

      if (!text) return []

      // Only what the narrator wrote can hold UI blocks; the player's text is never interpreted.
      const segments: NarrationSegment[] =
        stored.role === 'assistant' ? toNarrationSegments(text) : [{ type: 'prose', text }]

      return [{ id: stored.id, role: stored.role, text, segments, createdAt: stored.createdAt }]
    })
  }

  async deleteCampaign(worldId: string): Promise<void> {
    const memory = await (await this.loadMastra()).getAgent('narrator').getMemory()
    if (!memory) return

    // The thread is created by the first turn, so a campaign never played has nothing to delete.
    if (!(await memory.getThreadById({ threadId: campaignThreadId(worldId) }))) return

    await memory.deleteThread(campaignThreadId(worldId))
  }
}

/** One campaign per world for now; a session-per-thread model only needs a new id scheme here. */
function campaignThreadId(worldId: string): string {
  return `campaign-${worldId}`
}

/**
 * Turns Mastra's stream into the events above. Only the narrator's own text counts: what a
 * specialist writes reaches the stream wrapped in tool output, never as a top-level text chunk, and
 * Observational Memory's progress arrives as `data-om-*` chunks, which are not narration either.
 * Mastra reports a failure as an `error` chunk instead of throwing, so it is rethrown here.
 */
async function* toNarratorEvents(output: {
  fullStream: AsyncIterable<{ type: string; payload?: unknown }>
}): AsyncGenerator<NarratorStreamEvent> {
  const splitter = new NarrationStreamSplitter()
  let reply = ''

  for await (const chunk of output.fullStream) {
    if (chunk.type === 'text-delta') {
      const text = (chunk.payload as { text: string }).text
      reply += text
      for (const delta of splitter.push(text)) yield { type: 'delta', ...delta }
    } else if (chunk.type === 'error') {
      const { error } = chunk.payload as { error: unknown }
      throw error instanceof Error ? error : new Error(String(error))
    }
  }
  for (const delta of splitter.end()) yield { type: 'delta', ...delta }

  // The history trims what it stores; the final text must match it.
  const text = reply.trim()
  yield { type: 'done', text, segments: toNarrationSegments(text) }
}

/**
 * A narrator reply as prose and UI blocks, each block already checked against the vocabulary. A
 * block with issues is kept (the parser still renders what it can) and logged, which is how a model
 * that drifts from the prompt shows up.
 */
export function toNarrationSegments(reply: string): NarrationSegment[] {
  return splitNarration(reply).map(({ kind, text }): NarrationSegment => {
    if (kind === 'prose') return { type: 'prose', text }

    const issues = validateNarratorUi(text)
    if (issues.length > 0) console.warn('The narrator wrote a UI block with issues:', issues, text)

    return { type: 'ui', source: text, issues }
  })
}
