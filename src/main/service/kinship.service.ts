import { ConflictError, NotFoundError } from '@error'
import type { IActorRepository } from '@repository/actor.repository'
import type { IKinshipRepository } from '@repository/kinship.repository'
import type { Actor } from '@schema/actor.schema'
import type {
  CreateActorWithRelatives,
  FamilyMember,
  Kinship,
  RemoveKinship,
  SetKinship
} from '@schema/kinship.schema'
import type { IActorService } from '@service/actor.service'
import {
  deriveRelatives,
  describeKinship,
  findKinshipConflict,
  linksPair,
  toKinshipInput,
  toKinshipLink,
  type KinshipLink,
  type PromptRelative
} from '@util/kinship.util'
import { randomUUID } from 'node:crypto'

/** Most relatives written into the prompt of an NPC, closest first, so a large family stays short. */
const MAX_PROMPT_RELATIVES = 12

export interface IKinshipService {
  /** The family of the actor: the direct bonds and everyone the engine derives from them. */
  listForActor(actorId: string): Promise<FamilyMember[]>
  /**
   * The relatives of each actor as the prompt cites them (name, bond, age, id), closest first and cut
   * at a limit. One read for the whole list; an actor with no family maps to an empty list.
   */
  listForPrompt(worldId: string, actorIds: string[]): Promise<Map<string, PromptRelative[]>>
  /** Records or changes the bond between two actors; returns the family of `actorId` afterwards. */
  set(input: SetKinship): Promise<FamilyMember[]>
  /** Removes the direct bond between two actors; returns the family of `actorId` afterwards. */
  remove(input: RemoveKinship): Promise<FamilyMember[]>
  /** Creates the actor together with its bonds, or neither: a refused bond leaves no actor behind. */
  createActor(input: CreateActorWithRelatives): Promise<Actor>
}

/**
 * Only the direct bonds (parent, spouse) are stored; siblings, grandparents, uncles, cousins and
 * in-laws are derived from them on every read, so the family cannot contradict itself. An unknown
 * actor is a `NotFoundError`; actors of different worlds, a third parent, a second spouse, a loop in
 * the tree or a pair already linked are a `ConflictError`.
 */
export class KinshipService implements IKinshipService {
  constructor(
    private readonly kinshipRepository: IKinshipRepository,
    private readonly actorRepository: IActorRepository,
    private readonly actorService: IActorService
  ) {}

  async listForActor(actorId: string): Promise<FamilyMember[]> {
    const actor = await this.requireActor(actorId)
    const [links, byId] = await this.loadFamilyData(actor.worldId)

    return familyOf(links, byId, actorId)
  }

  async listForPrompt(worldId: string, actorIds: string[]): Promise<Map<string, PromptRelative[]>> {
    const [links, byId] = await this.loadFamilyData(worldId)

    return new Map(
      actorIds.map((id) => [
        id,
        familyOf(links, byId, id)
          .slice(0, MAX_PROMPT_RELATIVES)
          .map((member) => ({
            id: member.actorId,
            name: member.name,
            relation: describeKinship(member.relation, member.gender),
            age: member.age
          }))
      ])
    )
  }

  async set({ actorId, relativeId, relation }: SetKinship): Promise<FamilyMember[]> {
    const worldId = await this.resolveWorld(actorId, relativeId)
    const others = (await this.loadLinks(worldId)).filter(
      (link) => !linksPair(link, actorId, relativeId)
    )
    const link = toKinshipLink(actorId, relativeId, relation)
    assertAllowed(others, link)

    await this.kinshipRepository.replace(worldId, actorId, relativeId, link)

    return this.listForActor(actorId)
  }

  async remove({ actorId, relativeId }: RemoveKinship): Promise<FamilyMember[]> {
    const worldId = await this.resolveWorld(actorId, relativeId)
    await this.kinshipRepository.replace(worldId, actorId, relativeId)

    return this.listForActor(actorId)
  }

  async createActor({ relatives = [], ...input }: CreateActorWithRelatives): Promise<Actor> {
    const members = new Set(
      (await this.actorRepository.listByWorld(input.worldId)).map((a) => a.id)
    )

    // Checked against a stand-in id before anything is written, so a refusal costs nothing.
    const draftId = randomUUID()
    const links = await this.loadLinks(input.worldId)
    for (const { relativeId, relation } of relatives) {
      if (!members.has(relativeId)) throw new NotFoundError('Actor', relativeId)

      const link = toKinshipLink(draftId, relativeId, relation)
      assertAllowed(links, link)
      links.push(link)
    }

    const actor = await this.actorService.create(input)
    try {
      await this.kinshipRepository.addMany(
        actor.worldId,
        relatives.map(({ relativeId, relation }) => toKinshipLink(actor.id, relativeId, relation))
      )
    } catch (error) {
      await this.actorService.delete(actor.id)
      throw error
    }

    return actor
  }

  private async loadFamilyData(worldId: string): Promise<[KinshipLink[], Map<string, Actor>]> {
    const [links, actors] = await Promise.all([
      this.loadLinks(worldId),
      this.actorRepository.listByWorld(worldId)
    ])

    return [links, new Map(actors.map((actor) => [actor.id, actor]))]
  }

  private async loadLinks(worldId: string): Promise<KinshipLink[]> {
    const rows: Kinship[] = await this.kinshipRepository.listByWorld(worldId)

    return rows.map(({ kind, fromActorId, toActorId }) => ({ kind, fromActorId, toActorId }))
  }

  private async requireActor(id: string): Promise<Actor> {
    const actor = await this.actorRepository.findById(id)
    if (!actor) throw new NotFoundError('Actor', id)

    return actor
  }

  /** The world both actors share. */
  private async resolveWorld(aId: string, bId: string): Promise<string> {
    const [a, b] = await Promise.all([this.requireActor(aId), this.requireActor(bId)])
    if (a.worldId !== b.worldId) throw new ConflictError('The actors belong to different worlds')

    return a.worldId
  }
}

function assertAllowed(links: readonly KinshipLink[], link: KinshipLink): void {
  const conflict = findKinshipConflict(links, link)
  if (conflict) throw new ConflictError(conflict)
}

/** The family of `actorId`, closest first; a relative that no longer exists is left out. */
function familyOf(
  links: readonly KinshipLink[],
  byId: ReadonlyMap<string, Actor>,
  actorId: string
): FamilyMember[] {
  const direct = new Map(
    links
      .filter((link) => link.fromActorId === actorId || link.toActorId === actorId)
      .map((link) => {
        const relativeId = link.fromActorId === actorId ? link.toActorId : link.fromActorId

        return [relativeId, toKinshipInput(link, actorId)] as const
      })
  )

  return deriveRelatives(links, actorId).flatMap(({ actorId: relativeId, relation }) => {
    const relative = byId.get(relativeId)
    if (!relative) return []

    return [
      {
        actorId: relativeId,
        name: relative.name,
        imagePath: relative.imagePath,
        gender: relative.gender,
        age: relative.age,
        relation,
        direct: direct.get(relativeId) ?? null
      }
    ]
  })
}
