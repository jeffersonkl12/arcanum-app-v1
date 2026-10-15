import { AI_HELPER_MODELS, toMastraModelId, type MessageRating } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type {
  CampaignMessage,
  INarratorGateway,
  NarratorStreamEvent,
  NarratorTurn
} from '@lib/narrator.lib'
import type { Actor } from '@schema/actor.schema'
import type { PointOfInterest } from '@schema/point-of-interest.schema'
import type { IActorService } from '@service/actor.service'
import type { ICultureService } from '@service/culture.service'
import type { ILanguageService } from '@service/language.service'
import type { ICampaignService } from '@service/campaign.service'
import type { IAiSettingService } from '@service/ai-setting.service'
import type { IDiceCheckService } from '@service/dice-check.service'
import type { ILiveContextService } from '@service/live-context.service'
import type { IMemoryService } from '@service/memory.service'
import type { IMessageRatingService } from '@service/message-rating.service'
import type { IPartyService } from '@service/party.service'
import type { IPointOfInterestService } from '@service/point-of-interest.service'
import type { IKinshipService } from '@service/kinship.service'
import type { IRelationshipService } from '@service/relationship.service'
import type { IWorldService } from '@service/world.service'
import { describeAttributeLevel } from '@util/attribute-level.util'
import { formatRelative, type PromptRelative } from '@util/kinship.util'
import { resolveNpcStats } from '@util/npc-tier.util'
import { describeFeelings } from '@util/relationship.util'
import type { ICampaignRegistry } from '../../mastra/context/campaign.context'
import type { ICoinRegistry } from '../../mastra/context/coin.context'
import type { ITradeRegistry } from '../../mastra/context/trade.context'
import type { IRelationshipRegistry } from '../../mastra/context/relationship.context'
import type {
  CheckRequest,
  CreatedNpc,
  CreateNpcResult,
  CurrentPlace,
  IDiceChecker,
  INpcRegistry,
  Knowledge,
  NpcDraft,
  PartyMember,
  PartyRelationship,
  PartySnapshot,
  RollCheckResult
} from '../../mastra/context/game.context'
import type { IItemRegistry } from '../../mastra/context/item.context'
import type { IMemoryRegistry } from '../../mastra/context/memory.context'
import type { INpcSceneRegistry } from '../../mastra/context/npc-scene.context'
import type { IPointOfInterestRegistry } from '../../mastra/context/point-of-interest.context'

export interface IGameMasterService {
  /** Plays one turn of the world's campaign. Throws `NotFoundError` if the world does not exist. */
  takeTurn(worldId: string, playerMessage: string): Promise<string>
  /**
   * Same turn as `takeTurn`, but the narration arrives as it is written. Throws before returning if
   * the world does not exist (`NotFoundError`) or already has a turn running (`ConflictError`).
   * The caller must iterate the result to the end: that is what finishes the turn and frees the world.
   */
  streamTurn(worldId: string, playerMessage: string): Promise<AsyncIterable<NarratorStreamEvent>>
  /**
   * Plays the last turn again: takes it back from the conversation and streams a new narration for
   * the same player message. If the new turn then fails to start, the old one is already gone and
   * the caller has to read the history again. Throws `NotFoundError` for a missing world and `ConflictError` if a turn is
   * running or the last turn cannot be redone (see `CampaignMessage.canRegenerate`).
   */
  regenerateTurn(worldId: string): Promise<AsyncIterable<NarratorStreamEvent>>
  /**
   * Rates a reply of the narrator; `null` takes the rating back. Throws `NotFoundError` if the
   * world or the reply does not exist.
   */
  rateMessage(worldId: string, messageId: string, rating: MessageRating | null): Promise<void>
  /**
   * Removes a reply of the narrator from the conversation; the player's message stays. The game is
   * not touched: whatever the narrator did in that turn (dice, NPCs, items) still stands, only the
   * narrator no longer remembers having said it. Throws `NotFoundError` if the world or the reply
   * does not exist and `ConflictError` while a turn is running.
   */
  deleteMessage(worldId: string, messageId: string): Promise<void>
  /**
   * Rewrites a reply of the narrator in the stored conversation; from now on the narrator reads the
   * edited text as what it said. Like deleting, it does not touch the game. Throws `NotFoundError`
   * if the world or the reply does not exist and `ConflictError` while a turn is running.
   */
  editMessage(worldId: string, messageId: string, text: string): Promise<void>
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
    private readonly tradeRegistry: ITradeRegistry,
    private readonly pointOfInterestRegistry: IPointOfInterestRegistry,
    private readonly memoryRegistry: IMemoryRegistry,
    private readonly memoryService: IMemoryService,
    private readonly liveContext: ILiveContextService,
    private readonly relationshipService: IRelationshipService,
    private readonly relationshipRegistry: IRelationshipRegistry,
    private readonly campaignService: ICampaignService,
    private readonly campaignRegistry: ICampaignRegistry,
    private readonly messageRatingService: IMessageRatingService,
    private readonly pointOfInterestService: IPointOfInterestService,
    private readonly cultureService: ICultureService,
    private readonly languageService: ILanguageService,
    private readonly npcSceneRegistry: INpcSceneRegistry,
    private readonly kinshipService: IKinshipService
  ) {}

  async takeTurn(worldId: string, playerMessage: string): Promise<string> {
    return this.narrator.narrate(await this.prepareTurn(worldId, playerMessage))
  }

  async streamTurn(
    worldId: string,
    playerMessage: string
  ): Promise<AsyncIterable<NarratorStreamEvent>> {
    return this.startStream(worldId, async () => playerMessage)
  }

  async regenerateTurn(worldId: string): Promise<AsyncIterable<NarratorStreamEvent>> {
    return this.startStream(worldId, async () => {
      await this.worldService.get(worldId)

      const rewound = await this.narrator.rewindLastTurn(worldId)
      if (!rewound) throw new ConflictError('The last turn cannot be played again')

      await this.messageRatingService.forget(worldId, rewound.removedIds)

      return rewound.playerMessage
    })
  }

  async rateMessage(
    worldId: string,
    messageId: string,
    rating: MessageRating | null
  ): Promise<void> {
    await this.worldService.get(worldId)

    const messages = await this.narrator.listMessages(worldId)
    if (!messages.some((message) => message.id === messageId && message.role === 'assistant')) {
      throw new NotFoundError('Message', messageId)
    }

    await this.messageRatingService.rate(worldId, messageId, rating)

    // Evaluation data only: the rating above is what the player sees, so a trace that is missing or
    // an observability that fails must not undo it. Taking a rating back leaves the record as it was.
    if (rating === null) return
    try {
      await this.narrator.recordFeedback(worldId, messageId, rating)
    } catch (error) {
      console.warn('The rating could not be recorded as feedback of the narrator:', error)
    }
  }

  async editMessage(worldId: string, messageId: string, text: string): Promise<void> {
    await this.worldService.get(worldId)
    if (this.streaming.has(worldId)) {
      throw new ConflictError('The narrator is answering in this world')
    }

    if (!(await this.narrator.editReply(worldId, messageId, text))) {
      throw new NotFoundError('Message', messageId)
    }
  }

  async deleteMessage(worldId: string, messageId: string): Promise<void> {
    await this.worldService.get(worldId)
    // A turn writes to the same conversation, and its messages are not stored yet.
    if (this.streaming.has(worldId)) {
      throw new ConflictError('The narrator is answering in this world')
    }

    const removedIds = await this.narrator.deleteReply(worldId, messageId)
    if (removedIds.length === 0) throw new NotFoundError('Message', messageId)

    await this.messageRatingService.forget(worldId, removedIds)
  }

  async listHistory(worldId: string): Promise<CampaignMessage[]> {
    await this.worldService.get(worldId)

    const [messages, ratings] = await Promise.all([
      this.narrator.listMessages(worldId),
      this.messageRatingService.listByWorld(worldId)
    ])

    return messages.map((message) => ({ ...message, rating: ratings.get(message.id) ?? null }))
  }

  /**
   * Takes the world for a turn and starts it with the message `chooseMessage` returns. The world is
   * taken before any await, so two calls cannot both pass, and it is freed if the turn does not
   * start or when the iteration ends.
   */
  private async startStream(
    worldId: string,
    chooseMessage: () => Promise<string>
  ): Promise<AsyncIterable<NarratorStreamEvent>> {
    if (this.streaming.has(worldId)) {
      throw new ConflictError('The narrator is already answering in this world')
    }
    this.streaming.add(worldId)

    try {
      const turn = await this.prepareTurn(worldId, await chooseMessage())

      return this.releaseWhenDone(worldId, await this.narrator.narrateStream(turn))
    } catch (error) {
      this.streaming.delete(worldId)
      throw error
    }
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
    const names = await this.loadCultureNames(worldId)

    return {
      worldId,
      model: toMastraModelId(provider, model),
      helperModel: toMastraModelId(provider, AI_HELPER_MODELS[provider]),
      apiKey,
      temperature,
      world: {
        name: world.name,
        genre: world.genre,
        description: world.description,
        cultures: [...names.cultures.values()],
        languages: [...names.languages.values()],
        currentPlace: await this.loadCurrentPlace(worldId, names)
      },
      knowledge: await this.loadKnowledge(worldId),
      party: await this.loadParty(worldId, names),
      npcRegistry: this.createNpcRegistry(),
      itemRegistry: this.itemRegistry,
      coinRegistry: this.coinRegistry,
      tradeRegistry: this.tradeRegistry,
      pointOfInterestRegistry: this.pointOfInterestRegistry,
      memoryRegistry: this.memoryRegistry,
      npcSceneRegistry: this.npcSceneRegistry,
      relationshipRegistry: this.relationshipRegistry,
      campaignRegistry: this.campaignRegistry,
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

  /** Read on every turn. A world with no campaign record yet simply has nothing major to remember. */
  private async loadKnowledge(worldId: string): Promise<Knowledge> {
    const campaign = await this.campaignService.findByWorld(worldId)

    return { campaignSummary: campaign?.summary ?? '' }
  }

  /**
   * Where the party is: the place of the player's character, else of the first member that has one.
   * `null` while nobody in the party is in a place.
   */
  private async loadCultureNames(worldId: string): Promise<CultureNames> {
    const [cultures, languages] = await Promise.all([
      this.cultureService.listByWorld(worldId),
      this.languageService.listByWorld(worldId)
    ])

    return {
      cultures: new Map(cultures.map(({ id, name }) => [id, name])),
      languages: new Map(languages.map(({ id, name }) => [id, name]))
    }
  }

  private async loadCurrentPlace(
    worldId: string,
    names: CultureNames
  ): Promise<CurrentPlace | null> {
    const party = await this.partyService.findByWorld(worldId)
    if (!party) return null

    const members = await this.partyService.listMembers(party.id)
    const placeId = (
      members.find((member) => !member.isNpc && member.pointOfInterestId) ??
      members.find((member) => member.pointOfInterestId)
    )?.pointOfInterestId
    if (!placeId) return null

    const [path, places, actors] = await Promise.all([
      this.pointOfInterestService.getPath(placeId),
      this.pointOfInterestService.listByWorld(worldId),
      this.actorService.listByWorld(worldId)
    ])
    const place = path[path.length - 1]
    // The party is already in the party section; what is listed here is everyone else.
    const npcs = actors.filter((actor) => actor.isNpc && !actor.partyId && actor.pointOfInterestId)
    const families = await this.kinshipService.listForPrompt(
      worldId,
      npcs.map((npc) => npc.id)
    )

    return {
      name: place.name,
      type: place.type,
      description: place.description,
      path: path.map(({ name, type }) => ({ name, type })),
      hasParent: place.parentId !== null,
      inside: outlineInside(place.id, places, npcs, families),
      npcs: npcs
        .filter((npc) => npc.pointOfInterestId === place.id)
        .map((npc) => toPlaceNpc(npc, names, families.get(npc.id) ?? []))
    }
  }

  /** Read on every turn, so the prompt always shows the party as it is now. */
  private async loadParty(worldId: string, names: CultureNames): Promise<PartySnapshot> {
    const party = await this.partyService.findByWorld(worldId)
    if (!party) return { members: [] }

    const actors = await this.partyService.listMembers(party.id)

    // One read for every pair of the party; a pair with no row is neutral.
    const stored = await this.relationshipService.listAmong(actors.map((actor) => actor.id))
    const values = new Map(
      stored.map((row) => [`${row.fromActorId}:${row.toActorId}`, row.value] as const)
    )

    const families = await this.kinshipService.listForPrompt(
      worldId,
      actors.map((actor) => actor.id)
    )

    return {
      members: await Promise.all(
        actors.map((actor) =>
          this.toPartyMember(
            actor,
            toRelationships(actor, actors, values),
            families.get(actor.id) ?? [],
            names
          )
        )
      )
    }
  }

  /** The member plus the names of its items; ids, slots and descriptions stay out of the prompt. */
  private async toPartyMember(
    actor: Actor,
    relationships: PartyRelationship[],
    family: PromptRelative[],
    names: CultureNames
  ): Promise<PartyMember> {
    const { items } = await this.itemRegistry.getInventory(actor.worldId, actor.id)

    return {
      id: actor.id,
      name: actor.name,
      isPlayer: !actor.isNpc,
      age: actor.age,
      gender: actor.gender,
      culture: nameOf(names.cultures, actor.cultureId),
      language: nameOf(names.languages, actor.languageId),
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
      carried: items.filter((item) => !item.equippedSlot).map((item) => item.name),
      relationships,
      family
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

  /**
   * Where a new NPC starts: the place the narrator named (it must be in the world), or else where
   * the party is, so an NPC is never left nowhere just because nobody moved it afterwards.
   */
  private async resolveNpcPlace(
    worldId: string,
    placeId: string | undefined
  ): Promise<PointOfInterest | null> {
    if (placeId) {
      const place = await this.pointOfInterestService.get(placeId)
      if (place.worldId !== worldId) throw new NotFoundError('PointOfInterest', placeId)
      return place
    }

    const party = await this.partyService.findByWorld(worldId)
    if (!party) return null

    const members = await this.partyService.listMembers(party.id)
    const partyPlaceId = (
      members.find((member) => !member.isNpc && member.pointOfInterestId) ??
      members.find((member) => member.pointOfInterestId)
    )?.pointOfInterestId

    return partyPlaceId ? this.pointOfInterestService.get(partyPlaceId) : null
  }

  private createNpcRegistry(): INpcRegistry {
    return {
      createNpc: async (worldId: string, draft: NpcDraft): Promise<CreateNpcResult> => {
        try {
          const place = await this.resolveNpcPlace(worldId, draft.placeId)
          const names = await this.loadCultureNames(worldId)
          const cultureId = resolveNameId(names.cultures, draft.culture, 'culture')
          const languageId = resolveNameId(names.languages, draft.language, 'language')
          const actor = await this.kinshipService.createActor({
            worldId,
            isNpc: true,
            pointOfInterestId: place?.id ?? null,
            cultureId,
            languageId,
            name: draft.name,
            age: draft.age,
            gender: draft.gender,
            ...resolveNpcStats(draft),
            goldPieces: draft.goldPieces,
            silverPieces: draft.silverPieces,
            bronzePieces: draft.bronzePieces,
            profession: draft.profession ?? null,
            appearance: draft.appearance ?? null,
            personality: draft.personality ?? null,
            background: draft.background ?? null,
            relatives: draft.relatives
          })
          const family = (await this.kinshipService.listForPrompt(worldId, [actor.id])).get(
            actor.id
          )

          return {
            ok: true,
            npc: {
              ...toCreatedNpc(actor),
              culture: nameOf(names.cultures, actor.cultureId) ?? undefined,
              language: nameOf(names.languages, actor.languageId) ?? undefined,
              placeName: place?.name,
              family: family?.length ? family : undefined
            }
          }
        } catch (error) {
          // Only rule violations go back to the AI so it can fix the NPC; anything else is a bug.
          if (error instanceof ConflictError || error instanceof NotFoundError) {
            return { ok: false, reason: error.message }
          }
          throw error
        }
      }
    }
  }
}

/** Most places listed inside the current one, so a big building cannot flood the prompt. */
const MAX_PLACES_INSIDE = 40

/**
 * Everything inside `rootId` as outline lines, depth first, with the NPCs standing in each place. The `seen` set keeps a loop in the data
 * from hanging it.
 */
function outlineInside(
  rootId: string,
  places: PointOfInterest[],
  npcs: Actor[],
  families: ReadonlyMap<string, PromptRelative[]>
): string[] {
  const childrenOf = new Map<string, PointOfInterest[]>()

  for (const place of places) {
    if (place.parentId)
      childrenOf.set(place.parentId, [...(childrenOf.get(place.parentId) ?? []), place])
  }

  const lines: string[] = []
  const seen = new Set([rootId])
  let omitted = 0

  const visit = (parentId: string, depth: number): void => {
    for (const child of childrenOf.get(parentId) ?? []) {
      if (seen.has(child.id)) continue
      seen.add(child.id)

      if (lines.length >= MAX_PLACES_INSIDE) {
        omitted++
      } else {
        const present = npcs.filter((npc) => npc.pointOfInterestId === child.id)
        const who =
          present.length > 0
            ? ` - NPCs: ${present.map((npc) => describeInOutline(npc, families.get(npc.id) ?? [])).join('; ')}`
            : ''

        lines.push(`${'  '.repeat(depth)}- ${child.name} (${child.type})${who}`)
      }
      visit(child.id, depth + 1)
    }
  }

  visit(rootId, 0)

  return omitted > 0 ? [...lines, `...and ${omitted} more`] : lines
}

/** An NPC in the outline: its name, and its kin (name, bond, age, id) when it has any. */
function describeInOutline(npc: Actor, family: PromptRelative[]): string {
  return family.length > 0
    ? `${npc.name} (id: ${npc.id}; family: ${family.map(formatRelative).join(', ')})`
    : npc.name
}

/**
 * The id of the culture or language the narrator named (ignoring case), or `null` when it named
 * none. A name the world does not have is a rule violation, so the narrator can fix it.
 */
function resolveNameId(
  names: ReadonlyMap<string, string>,
  wanted: string | undefined,
  kind: 'culture' | 'language'
): string | null {
  const name = wanted?.trim()
  if (!name) return null

  for (const [id, candidate] of names) {
    if (candidate.toLocaleLowerCase() === name.toLocaleLowerCase()) return id
  }

  const available = [...names.values()].join(', ') || 'none'
  throw new ConflictError(`The world has no ${kind} "${name}". Available: ${available}`)
}

/** The names of the cultures and languages of a world, by id, to put on the sheets. */
interface CultureNames {
  cultures: ReadonlyMap<string, string>
  languages: ReadonlyMap<string, string>
}

function nameOf(names: ReadonlyMap<string, string>, id: string | null): string | null {
  return (id && names.get(id)) || null
}

/**
 * An NPC standing in the current place, as a short sheet. The background is left out on purpose:
 * it is long and only matters once the NPC becomes part of the story.
 */
function toPlaceNpc(
  npc: Actor,
  names: CultureNames,
  family: PromptRelative[]
): CurrentPlace['npcs'][number] {
  return {
    id: npc.id,
    name: npc.name,
    age: npc.age,
    gender: npc.gender,
    culture: nameOf(names.cultures, npc.cultureId),
    language: nameOf(names.languages, npc.languageId),
    profession: npc.profession,
    appearance: npc.appearance,
    personality: npc.personality,
    family
  }
}

/** What `actor` feels about each of the other members; `values` maps `fromId:toId` to the stored value. */
function toRelationships(
  actor: Actor,
  members: Actor[],
  values: ReadonlyMap<string, number>
): PartyRelationship[] {
  return describeFeelings(actor, members, values)
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
