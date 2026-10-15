import type { Agent, AgentExecutionOptions } from '@mastra/core/agent'
import type { MastraDBMessage, MastraMessagePart } from '@mastra/core/agent/message-list'
import type { Mastra } from '@mastra/core/mastra'
import { RequestContext } from '@mastra/core/request-context'
import { READ_ONLY_NARRATOR_TOOLS, type MessageRating } from '@constant'
import { validateNarratorUi } from '@lib/openui.lib'
import type { NarrationDeltaEvent, NarrationDoneEvent, NarrationSegment } from '@shared'
import { NarrationStreamSplitter, splitNarration } from '@util/narration.util'
import type {
  GameContext,
  IDiceChecker,
  INpcRegistry,
  Knowledge,
  PartySnapshot,
  WorldBrief
} from '../../mastra/context/game.context'
import type { ICampaignRegistry } from '../../mastra/context/campaign.context'
import type { ICoinRegistry } from '../../mastra/context/coin.context'
import type { IItemRegistry } from '../../mastra/context/item.context'
import type { LiveContextSection } from '../../mastra/context/live-context.context'
import type { IMemoryRegistry } from '../../mastra/context/memory.context'
import type { INpcSceneRegistry } from '../../mastra/context/npc-scene.context'
import type { IPointOfInterestRegistry } from '../../mastra/context/point-of-interest.context'
import type { IRelationshipRegistry } from '../../mastra/context/relationship.context'

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
  knowledge: Knowledge
  party: PartySnapshot
  npcRegistry: INpcRegistry
  itemRegistry: IItemRegistry
  coinRegistry: ICoinRegistry
  pointOfInterestRegistry: IPointOfInterestRegistry
  memoryRegistry: IMemoryRegistry
  npcSceneRegistry: INpcSceneRegistry
  relationshipRegistry: IRelationshipRegistry
  campaignRegistry: ICampaignRegistry
  /** Dynamic context that lingers in the prompt (memories, ...), already aged for this turn. */
  liveContext: LiveContextSection[]
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
  /** What the player thought of the reply. The gateway does not know it; the service fills it in. */
  rating: MessageRating | null
  /** The last reply of the campaign, and the turn that wrote it changed nothing in the game. */
  canRegenerate: boolean
}

/** A turn taken back from the conversation so it can be played again. */
export interface RewoundTurn {
  /** What the player said in it. */
  playerMessage: string
  /** The messages that were removed, the player's and the narrator's. */
  removedIds: string[]
}

/**
 * What a streamed turn emits: the narration as the model writes it, already split into prose and UI
 * blocks, then the whole reply once, exactly as the history will return it, so a client can replace
 * what it accumulated.
 */
export type NarratorStreamEvent = NarrationDeltaEvent | NarrationDoneEvent

/** The memory of the narrator agent, where the campaign conversation is stored. */
type NarratorMemory = NonNullable<Awaited<ReturnType<Agent['getMemory']>>>

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
  /**
   * Removes the last turn (the player's message and everything the narrator did after it) so it can
   * be played again. Returns `undefined`, removing nothing, if the campaign has no turn or the turn
   * rolled dice or changed the game: the engine does not undo that, so the turn cannot be redone.
   */
  rewindLastTurn(worldId: string): Promise<RewoundTurn | undefined>
  /**
   * Removes a reply of the narrator from the conversation, with the other messages it wrote in the
   * same turn (tool calls are stored as messages of their own). The player's message stays.
   * Returns the ids removed, none if `messageId` is not a reply of this campaign.
   */
  deleteReply(worldId: string, messageId: string): Promise<string[]>
  /**
   * Replaces the text of a reply of the narrator in the stored conversation, so the narrator reads
   * the edited version from now on. Resolves to whether it was done: `false` if `messageId` is not
   * a reply of this campaign.
   */
  editReply(worldId: string, messageId: string, text: string): Promise<boolean>
  /**
   * Attaches the player's rating of a reply to the trace that wrote it, for evaluation. Resolves to
   * whether it was recorded: a reply from a run with no trace has nowhere to attach it.
   */
  recordFeedback(worldId: string, messageId: string, rating: MessageRating): Promise<boolean>
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
    knowledge,
    party,
    npcRegistry,
    itemRegistry,
    coinRegistry,
    pointOfInterestRegistry,
    memoryRegistry,
    npcSceneRegistry,
    relationshipRegistry,
    campaignRegistry,
    liveContext,
    diceChecker
  }: NarratorTurn): Promise<PreparedRun> {
    const narrator = (await this.loadMastra()).getAgent('narrator')

    const requestContext = new RequestContext<GameContext>()
    requestContext.set('worldId', worldId)
    requestContext.set('narratorModel', { id: model, apiKey })
    requestContext.set('helperModel', { id: helperModel, apiKey })
    requestContext.set('world', world)
    requestContext.set('knowledge', knowledge)
    requestContext.set('party', party)
    requestContext.set('npcRegistry', npcRegistry)
    requestContext.set('itemRegistry', itemRegistry)
    requestContext.set('coinRegistry', coinRegistry)
    requestContext.set('pointOfInterestRegistry', pointOfInterestRegistry)
    requestContext.set('memoryRegistry', memoryRegistry)
    requestContext.set('npcSceneRegistry', npcSceneRegistry)
    requestContext.set('relationshipRegistry', relationshipRegistry)
    requestContext.set('campaignRegistry', campaignRegistry)
    requestContext.set('liveContext', liveContext)
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
    const stored = await this.recallCampaign(worldId)
    const lastTurn = lastTurnOf(stored)
    const lastReply = lastTurn.findLast((message) => message.role === 'assistant')
    const canRegenerate = lastTurn.length > 1 && isRepeatable(lastTurn)

    // Tool calls and reports of specialists are plumbing; the player only sees the dialogue.
    return stored.flatMap((message) => {
      if (message.role !== 'user' && message.role !== 'assistant') return []

      const text = textOf(message)
      if (!text) return []

      // Only what the narrator wrote can hold UI blocks; the player's text is never interpreted.
      const segments: NarrationSegment[] =
        message.role === 'assistant' ? toNarrationSegments(text) : [{ type: 'prose', text }]

      return [
        {
          id: message.id,
          role: message.role,
          text,
          segments,
          createdAt: message.createdAt,
          rating: null,
          canRegenerate: canRegenerate && message.id === lastReply?.id
        }
      ]
    })
  }

  async rewindLastTurn(worldId: string): Promise<RewoundTurn | undefined> {
    const memory = await this.campaignMemory()
    const lastTurn = lastTurnOf(await this.recallCampaign(worldId))
    const [opening] = lastTurn
    if (!memory || opening?.role !== 'user' || !isRepeatable(lastTurn)) return undefined

    const removedIds = lastTurn.map((message) => message.id)
    await memory.deleteMessages(removedIds)

    return { playerMessage: textOf(opening), removedIds }
  }

  async deleteReply(worldId: string, messageId: string): Promise<string[]> {
    const memory = await this.campaignMemory()
    const stored = await this.recallCampaign(worldId)
    const index = stored.findIndex((message) => message.id === messageId)
    if (!memory || stored[index]?.role !== 'assistant') return []

    // The narrator's messages of one turn are contiguous, between two messages of the player.
    let first = index
    let last = index
    while (stored[first - 1]?.role === 'assistant') first--
    while (stored[last + 1]?.role === 'assistant') last++

    const removedIds = stored.slice(first, last + 1).map((message) => message.id)
    await memory.deleteMessages(removedIds)

    return removedIds
  }

  async editReply(worldId: string, messageId: string, text: string): Promise<boolean> {
    const memory = await this.campaignMemory()
    const reply = (await this.recallCampaign(worldId)).find((message) => message.id === messageId)
    if (!memory || reply?.role !== 'assistant') return false

    // The text becomes a single part where the first one was; reasoning and tool calls stay.
    const parts: MastraMessagePart[] = []
    let placed = false
    for (const part of reply.content.parts) {
      if (part.type !== 'text') parts.push(part)
      else if (!placed) {
        placed = true
        parts.push({ ...part, text })
      }
    }
    if (!placed) return false

    // The storage merges `content` field by field, so `parts` (what the history is read from) is
    // replaced and the rest, `metadata` and its trace id included, stays.
    const content = { ...reply.content, parts, content: text }
    await (
      await memory.storage.getStore('memory')
    )?.updateMessages({
      messages: [{ id: messageId, content }]
    })

    return true
  }

  async recordFeedback(
    worldId: string,
    messageId: string,
    rating: MessageRating
  ): Promise<boolean> {
    const message = (await this.recallCampaign(worldId)).find((item) => item.id === messageId)
    const traceId = message?.content.metadata?.traceId
    if (typeof traceId !== 'string') return false

    const { observability } = await this.loadMastra()
    // Optional on the interface: an observability that cannot take feedback is not an error.
    if (!observability.addFeedback) return false

    await observability.addFeedback({
      traceId,
      feedback: { feedbackSource: 'user', feedbackType: 'thumbs', value: rating }
    })

    return true
  }

  async deleteCampaign(worldId: string): Promise<void> {
    const memory = await this.campaignMemory()
    if (!memory) return

    // The thread is created by the first turn, so a campaign never played has nothing to delete.
    if (!(await memory.getThreadById({ threadId: campaignThreadId(worldId) }))) return

    await memory.deleteThread(campaignThreadId(worldId))
  }

  private async campaignMemory(): Promise<NarratorMemory | undefined> {
    return (await (await this.loadMastra()).getAgent('narrator').getMemory()) ?? undefined
  }

  /** Every message of the campaign, oldest first; empty for a campaign that was never played. */
  private async recallCampaign(worldId: string): Promise<MastraDBMessage[]> {
    const memory = await this.campaignMemory()
    if (!memory) return []

    // The thread is created by the first turn, so a new campaign has no history yet (and `recall`
    // throws for a thread that does not exist).
    if (!(await memory.getThreadById({ threadId: campaignThreadId(worldId) }))) return []

    const { messages } = await memory.recall({
      threadId: campaignThreadId(worldId),
      resourceId: worldId,
      perPage: false
    })

    return messages
  }
}

/** The text parts of a stored message, joined; tool calls and the like have none. */
function textOf(message: MastraDBMessage): string {
  return message.content.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('')
    .trim()
}

/**
 * The last turn of a conversation: the player's message and everything stored after it (the
 * narrator can write more than one message while it uses tools). Empty if the player never spoke.
 */
function lastTurnOf(messages: MastraDBMessage[]): MastraDBMessage[] {
  const start = messages.findLastIndex((message) => message.role === 'user')

  return start === -1 ? [] : messages.slice(start)
}

/** Whether a turn can be played again: every tool it called only read the game. */
function isRepeatable(turn: MastraDBMessage[]): boolean {
  return turn.every((message) =>
    message.content.parts.every(
      (part) =>
        part.type !== 'tool-invocation' ||
        READ_ONLY_NARRATOR_TOOLS.includes(part.toolInvocation.toolName)
    )
  )
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
