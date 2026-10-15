import { NPC_SCENE } from '@constant'
import type { Actor } from '@schema/actor.schema'
import type { IActorService } from '@service/actor.service'
import type { ContextEntry, ContextSectionSpec } from '@service/context-window.service'
import type { ICultureService } from '@service/culture.service'
import type { ILanguageService } from '@service/language.service'
import type { IKinshipService } from '@service/kinship.service'
import type { IContextSource } from '@service/live-context.service'
import type { IPartyService } from '@service/party.service'
import type { IRelationshipService } from '@service/relationship.service'
import { describeAttributeLevel } from '@util/attribute-level.util'
import { formatNpcSheet, mentionsName, type NpcSheet } from '@util/npc-sheet.util'
import { describeFeelings } from '@util/relationship.util'
import type { IItemRegistry } from '../../mastra/context/item.context'
import type {
  INpcSceneRegistry,
  NpcEngageOutcome,
  NpcEngageResult,
  NpcReleaseResult
} from '../../mastra/context/npc-scene.context'

const SECTION: ContextSectionSpec = { title: 'NPCs in the scene (full sheets)', order: 0 }

export interface INpcSceneService extends INpcSceneRegistry, IContextSource {}

/**
 * The NPCs engaged with the player right now. The AI engages and releases them; the engine keeps
 * who is in and for how long, and renders the sheets again from the database on every turn, so
 * health, items and feelings are never out of date (the context window alone would keep the text
 * it was first given). An NPC leaves when released, when it goes `NPC_SCENE.ttlTurns` turns
 * without the player naming it, or to make room for another. The state lives in memory, like the
 * rest of the live context.
 */
export class NpcSceneService implements INpcSceneService {
  /** World -> NPC id -> turns left. Insertion order is how long ago each was engaged. */
  private readonly scenes = new Map<string, Map<string, number>>()

  constructor(
    private readonly actorService: IActorService,
    private readonly partyService: IPartyService,
    private readonly relationshipService: IRelationshipService,
    private readonly kinshipService: IKinshipService,
    private readonly cultureService: ICultureService,
    private readonly languageService: ILanguageService,
    private readonly itemRegistry: IItemRegistry
  ) {}

  async engage(worldId: string, npcIds: string[]): Promise<NpcEngageResult> {
    const scene = this.sceneOf(worldId)
    const results: NpcEngageOutcome[] = []

    for (const actorId of new Set(npcIds)) {
      const outcome = await this.engageOne(worldId, actorId, scene)
      results.push(outcome)
    }

    const releasedForRoom = await this.makeRoom(worldId, scene)

    return { results, releasedForRoom }
  }

  async release(worldId: string, npcIds: string[]): Promise<NpcReleaseResult> {
    const scene = this.sceneOf(worldId)
    const released: string[] = []

    for (const id of npcIds) {
      if (scene.delete(id)) released.push(await this.nameOf(id))
    }

    return {
      released,
      stillEngaged: await Promise.all([...scene.keys()].map((id) => this.nameOf(id)))
    }
  }

  async collect(worldId: string, playerMessage: string): Promise<ContextEntry[]> {
    const scene = this.scenes.get(worldId)
    if (!scene || scene.size === 0) return []

    const entries: ContextEntry[] = []
    try {
      const context = await this.loadContext(worldId)

      for (const [id, remaining] of [...scene]) {
        const actor = await this.findNpc(worldId, id)
        const turnsLeft =
          actor && mentionsName(playerMessage, actor.name) ? NPC_SCENE.ttlTurns : remaining - 1
        if (!actor || turnsLeft <= 0) {
          scene.delete(id)
          continue
        }

        scene.set(id, turnsLeft)
        entries.push(await this.toEntry(actor, context))
      }
    } catch (error) {
      // A sheet that cannot be read must not cost the player the turn.
      console.error('Could not build the NPC sheets of the scene:', error)
    }

    return entries
  }

  forget(worldId: string): void {
    this.scenes.delete(worldId)
  }

  private sceneOf(worldId: string): Map<string, number> {
    let scene = this.scenes.get(worldId)
    if (!scene) {
      scene = new Map()
      this.scenes.set(worldId, scene)
    }

    return scene
  }

  private async engageOne(
    worldId: string,
    actorId: string,
    scene: Map<string, number>
  ): Promise<NpcEngageOutcome> {
    const actor = await this.findNpc(worldId, actorId)
    if (!actor) {
      return { ok: false, actorId, reason: 'There is no NPC with this id in this world' }
    }
    if (actor.partyId) {
      return {
        ok: false,
        actorId,
        name: actor.name,
        reason: 'A party member is already fully in the prompt'
      }
    }

    // Engaging again keeps the NPC and makes it the most recent one.
    scene.delete(actorId)
    scene.set(actorId, NPC_SCENE.ttlTurns)

    const sheet = formatNpcSheet(await this.toSheet(actor, await this.loadContext(worldId)))

    return { ok: true, actorId, name: actor.name, sheet }
  }

  /** Lets the ones engaged for longest go when there are more than `NPC_SCENE.maxActive`. */
  private async makeRoom(worldId: string, scene: Map<string, number>): Promise<string[]> {
    const left: string[] = []

    while (scene.size > NPC_SCENE.maxActive) {
      const [oldest] = scene.keys()
      scene.delete(oldest)
      left.push(await this.nameOf(oldest))
    }
    void worldId

    return left
  }

  private async findNpc(worldId: string, id: string): Promise<Actor | undefined> {
    try {
      const actor = await this.actorService.get(id)

      return actor.worldId === worldId && actor.isNpc ? actor : undefined
    } catch {
      return undefined
    }
  }

  private async nameOf(id: string): Promise<string> {
    try {
      return (await this.actorService.get(id)).name
    } catch {
      return id
    }
  }

  /** What every sheet of the turn shares: the names of cultures and languages, and the party. */
  private async loadContext(worldId: string): Promise<SceneContext> {
    const [cultures, languages, party] = await Promise.all([
      this.cultureService.listByWorld(worldId),
      this.languageService.listByWorld(worldId),
      this.partyService.findByWorld(worldId)
    ])

    return {
      cultures: new Map(cultures.map(({ id, name }) => [id, name])),
      languages: new Map(languages.map(({ id, name }) => [id, name])),
      party: party ? await this.partyService.listMembers(party.id) : []
    }
  }

  private async toEntry(actor: Actor, context: SceneContext): Promise<ContextEntry> {
    return {
      key: `npc-scene:${actor.id}`,
      section: SECTION,
      text: formatNpcSheet(await this.toSheet(actor, context)),
      // One turn: the entry is returned again while the NPC stays engaged, and leaves with it.
      ttlTurns: 1
    }
  }

  private async toSheet(actor: Actor, context: SceneContext): Promise<NpcSheet> {
    const { items } = await this.itemRegistry.getInventory(actor.worldId, actor.id)
    const stored = await this.relationshipService.listAmong([
      actor.id,
      ...context.party.map((member) => member.id)
    ])
    const values = new Map(
      stored.map((row) => [`${row.fromActorId}:${row.toActorId}`, row.value] as const)
    )

    return {
      id: actor.id,
      name: actor.name,
      age: actor.age,
      gender: actor.gender,
      culture: (actor.cultureId && context.cultures.get(actor.cultureId)) || null,
      language: (actor.languageId && context.languages.get(actor.languageId)) || null,
      profession: actor.profession,
      appearance: actor.appearance,
      personality: actor.personality,
      background: actor.background,
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
      equipped: items.filter((item) => item.equippedSlot).map((item) => item.name),
      carried: items.filter((item) => !item.equippedSlot).map((item) => item.name),
      relationships: describeFeelings(actor, context.party, values),
      family:
        (await this.kinshipService.listForPrompt(actor.worldId, [actor.id])).get(actor.id) ?? []
    }
  }
}

interface SceneContext {
  cultures: ReadonlyMap<string, string>
  languages: ReadonlyMap<string, string>
  party: Actor[]
}
