import { AI_HELPER_MODELS, toMastraModelId } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type {
  CampaignMessage,
  INarratorGateway,
  NarratorStreamEvent,
  NarratorTurn
} from '@lib/narrator.lib'
import type { Actor } from '@schema/actor.schema'
import type { IActorService } from '@service/actor.service'
import type { IAiSettingService } from '@service/ai-setting.service'
import type { IDiceCheckService } from '@service/dice-check.service'
import type { ILiveContextService } from '@service/live-context.service'
import type { IMemoryService } from '@service/memory.service'
import type { IPartyService } from '@service/party.service'
import type { IWorldService } from '@service/world.service'
import { describeAttributeLevel } from '@util/attribute-level.util'
import type { ICoinRegistry } from '../../mastra/context/coin.context'
import type {
  CheckRequest,
  CreatedNpc,
  CreateNpcResult,
  IDiceChecker,
  INpcRegistry,
  NpcDraft,
  PartyMember,
  PartySnapshot,
  RollCheckResult
} from '../../mastra/context/game.context'
import type { IItemRegistry } from '../../mastra/context/item.context'
import type { IMemoryRegistry } from '../../mastra/context/memory.context'

export interface IGameMasterService {
  /** Plays one turn of the world's campaign. Throws `NotFoundError` if the world does not exist. */
  takeTurn(worldId: string, playerMessage: string): Promise<string>
  /**
   * Same turn as `takeTurn`, but the narration arrives as it is written. Throws before returning if
   * the world does not exist (`NotFoundError`) or already has a turn running (`ConflictError`).
   * The caller must iterate the result to the end: that is what finishes the turn and frees the world.
   */
  streamTurn(worldId: string, playerMessage: string): Promise<AsyncIterable<NarratorStreamEvent>>
  /** The stored conversation of the world's campaign. Throws `NotFoundError` for a missing world. */
  listHistory(worldId: string): Promise<CampaignMessage[]>
  /**
   * Deletes a campaign: the world, everything that belongs to it and its stored conversation.
   * Throws `NotFoundError` for a missing world and `ConflictError` for a template (templates are
   * deleted as worlds) or while a turn is running.
   */
  deleteCampaign(worldId: string): Promise<void>
}

/**
 * Entry point of the AI game master. The AI only proposes; this class hands it the engine through
 * `INpcRegistry`, which validates every NPC with the same rules as any other actor, and rolls its
 * checks through the dice check service.
 */
export class GameMasterService implements IGameMasterService {
  /** Worlds with a streamed turn in flight: two turns on one campaign would interleave in its memory. */
  private readonly streaming = new Set<string>()

  constructor(
    private readonly narrator: INarratorGateway,
    private readonly worldService: IWorldService,
    private readonly aiSettingService: IAiSettingService,
    private readonly actorService: IActorService,
    private readonly partyService: IPartyService,
    private readonly diceCheckService: IDiceCheckService,
    private readonly itemRegistry: IItemRegistry,
    private readonly coinRegistry: ICoinRegistry,
    private readonly memoryRegistry: IMemoryRegistry,
    private readonly memoryService: IMemoryService,
    private readonly liveContext: ILiveContextService
  ) {}

  async takeTurn(worldId: string, playerMessage: string): Promise<string> {
    return this.narrator.narrate(await this.prepareTurn(worldId, playerMessage))
  }

  async streamTurn(
    worldId: string,
    playerMessage: string
  ): Promise<AsyncIterable<NarratorStreamEvent>> {
    // Checked and taken before any await, so two calls cannot both pass.
    if (this.streaming.has(worldId)) {
      throw new ConflictError('The narrator is already answering in this world')
    }
    this.streaming.add(worldId)

    try {
      const turn = await this.prepareTurn(worldId, playerMessage)

      return this.releaseWhenDone(worldId, await this.narrator.narrateStream(turn))
    } catch (error) {
      this.streaming.delete(worldId)
      throw error
    }
  }

  async listHistory(worldId: string): Promise<CampaignMessage[]> {
    await this.worldService.get(worldId)

    return this.narrator.listMessages(worldId)
  }

  async deleteCampaign(worldId: string): Promise<void> {
    const world = await this.worldService.get(worldId)
    if (world.isTemplate) throw new ConflictError('A template is not a campaign')
    if (this.streaming.has(worldId)) {
      throw new ConflictError('The narrator is answering in this campaign')
    }

    // Conversation first: if it fails the campaign is still whole and can be deleted again.
    await this.narrator.deleteCampaign(worldId)
    await this.memoryService.deleteByWorld(worldId)
    this.liveContext.forget(worldId)
    await this.worldService.delete(worldId)
  }

  /** What the narrator needs for a turn, read now so the prompt shows the world as it is. */
  private async prepareTurn(worldId: string, message: string): Promise<NarratorTurn> {
    const world = await this.worldService.get(worldId)
    const { provider, model, temperature, apiKey } = await this.aiSettingService.resolve()

    return {
      worldId,
      model: toMastraModelId(provider, model),
      helperModel: toMastraModelId(provider, AI_HELPER_MODELS[provider]),
      apiKey,
      temperature,
      world: { name: world.name, genre: world.genre, description: world.description },
      party: await this.loadParty(worldId),
      npcRegistry: this.createNpcRegistry(),
      itemRegistry: this.itemRegistry,
      coinRegistry: this.coinRegistry,
      memoryRegistry: this.memoryRegistry,
      liveContext: await this.liveContext.prepareTurn(worldId, message),
      diceChecker: this.createDiceChecker(),
      message
    }
  }

  /** Frees the world when the turn ends for any reason: completed, failed or abandoned midway. */
  private async *releaseWhenDone(
    worldId: string,
    events: AsyncIterable<NarratorStreamEvent>
  ): AsyncGenerator<NarratorStreamEvent> {
    try {
      yield* events
    } finally {
      this.streaming.delete(worldId)
    }
  }

  /** Read on every turn, so the prompt always shows the party as it is now. */
  private async loadParty(worldId: string): Promise<PartySnapshot> {
    const party = await this.partyService.findByWorld(worldId)
    if (!party) return { members: [] }

    const actors = await this.partyService.listMembers(party.id)

    return { members: await Promise.all(actors.map((actor) => this.toPartyMember(actor))) }
  }

  /** The member plus the names of its items; ids, slots and descriptions stay out of the prompt. */
  private async toPartyMember(actor: Actor): Promise<PartyMember> {
    const { items } = await this.itemRegistry.getInventory(actor.worldId, actor.id)

    return {
      id: actor.id,
      name: actor.name,
      isPlayer: !actor.isNpc,
      age: actor.age,
      gender: actor.gender,
      hpCurrent: actor.hpCurrent,
      hpMax: actor.hpMax,
      strength: actor.strength,
      dexterity: actor.dexterity,
      intelligence: actor.intelligence,
      strengthLevel: describeAttributeLevel('strength', actor.strength),
      dexterityLevel: describeAttributeLevel('dexterity', actor.dexterity),
      intelligenceLevel: describeAttributeLevel('intelligence', actor.intelligence),
      goldPieces: actor.goldPieces,
      silverPieces: actor.silverPieces,
      bronzePieces: actor.bronzePieces,
      profession: actor.profession,
      appearance: actor.appearance,
      personality: actor.personality,
      background: actor.background,
      equipped: items.filter((item) => item.equippedSlot).map((item) => item.name),
      carried: items.filter((item) => !item.equippedSlot).map((item) => item.name)
    }
  }

  /** Rolls only for actors of the world; a refusal goes back to the AI so it can fix the call. */
  private createDiceChecker(): IDiceChecker {
    return {
      check: async (worldId: string, request: CheckRequest): Promise<RollCheckResult> => {
        try {
          const actor = await this.actorService.get(request.actorId)
          if (actor.worldId !== worldId) {
            return { ok: false, reason: 'That actor does not belong to this world' }
          }

          return { ok: true, result: await this.diceCheckService.check(request) }
        } catch (error) {
          if (error instanceof NotFoundError) return { ok: false, reason: error.message }
          throw error
        }
      }
    }
  }

  private createNpcRegistry(): INpcRegistry {
    return {
      createNpc: async (worldId: string, draft: NpcDraft): Promise<CreateNpcResult> => {
        try {
          const actor = await this.actorService.create({
            worldId,
            isNpc: true,
            name: draft.name,
            age: draft.age,
            gender: draft.gender,
            strength: draft.strength,
            dexterity: draft.dexterity,
            intelligence: draft.intelligence,
            hpMax: draft.hpMax,
            goldPieces: draft.goldPieces,
            silverPieces: draft.silverPieces,
            bronzePieces: draft.bronzePieces,
            profession: draft.profession ?? null,
            appearance: draft.appearance ?? null,
            personality: draft.personality ?? null,
            background: draft.background ?? null
          })

          return { ok: true, npc: toCreatedNpc(actor) }
        } catch (error) {
          // Only rule violations go back to the AI so it can fix the NPC; anything else is a bug.
          if (error instanceof ConflictError) return { ok: false, reason: error.message }
          throw error
        }
      }
    }
  }
}

/** The NPC as the engine stored it, defaults included; empty text fields are left out. */
function toCreatedNpc(actor: Actor): CreatedNpc {
  return {
    id: actor.id,
    name: actor.name,
    age: actor.age,
    gender: actor.gender,
    hpMax: actor.hpMax,
    strength: actor.strength,
    dexterity: actor.dexterity,
    intelligence: actor.intelligence,
    goldPieces: actor.goldPieces,
    silverPieces: actor.silverPieces,
    bronzePieces: actor.bronzePieces,
    profession: actor.profession ?? undefined,
    appearance: actor.appearance ?? undefined,
    personality: actor.personality ?? undefined,
    background: actor.background ?? undefined
  }
}
