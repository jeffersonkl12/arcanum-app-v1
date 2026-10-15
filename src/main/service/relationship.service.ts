import { NotFoundError } from '@error'
import type { IActorRepository } from '@repository/actor.repository'
import type { IRelationshipRepository } from '@repository/relationship.repository'
import type { ActorRelationship, Feeling, Relationship } from '@schema/relationship.schema'
import { getRelationshipLevel } from '@util/relationship.util'
import { RELATIONSHIP_LIMITS } from '@constant'

export interface IRelationshipService {
  /** The stored values among the actors; a pair with no entry is neutral. */
  listAmong(actorIds: string[]): Promise<Relationship[]>
  /** Everyone with a stored value toward or from the actor, with both directions (neutral when only one is stored). */
  listForActor(actorId: string): Promise<ActorRelationship[]>
  /** What `fromActorId` feels about `toActorId` becomes `value`. */
  set(fromActorId: string, toActorId: string, value: number): Promise<Relationship>
  /** What `fromActorId` feels about `toActorId` moves by `delta`, stopping at -100 and 100. */
  shift(fromActorId: string, toActorId: string, delta: number): Promise<Relationship>
}

/**
 * Relationships between actors of one world, in either direction and between any two actors (player
 * and NPC, NPC and NPC). An unknown actor is a `NotFoundError`; actors of different worlds, the same
 * actor on both ends or a value out of range are a `ConflictError`.
 */
export class RelationshipService implements IRelationshipService {
  constructor(
    private readonly relationshipRepository: IRelationshipRepository,
    private readonly actorRepository: IActorRepository
  ) {}

  listAmong(actorIds: string[]): Promise<Relationship[]> {
    return this.relationshipRepository.listAmong(actorIds)
  }

  async listForActor(actorId: string): Promise<ActorRelationship[]> {
    const actor = await this.actorRepository.findById(actorId)
    if (!actor) throw new NotFoundError('Actor', actorId)

    const stored = await this.relationshipRepository.listOfActor(actorId)
    const feels = new Map<string, number>()
    const feltBy = new Map<string, number>()
    for (const row of stored) {
      if (row.fromActorId === actorId) feels.set(row.toActorId, row.value)
      else feltBy.set(row.fromActorId, row.value)
    }

    const others = new Map(
      (await this.actorRepository.listByWorld(actor.worldId)).map((other) => [other.id, other])
    )
    const feeling = (value: number = RELATIONSHIP_LIMITS.default): Feeling => ({
      value,
      level: getRelationshipLevel(value)
    })

    return [...new Set([...feels.keys(), ...feltBy.keys()])].flatMap((id) => {
      const other = others.get(id)
      if (!other) return []

      return [
        {
          actorId: id,
          name: other.name,
          imagePath: other.imagePath,
          feels: feeling(feels.get(id)),
          feltBy: feeling(feltBy.get(id))
        }
      ]
    })
  }

  async set(fromActorId: string, toActorId: string, value: number): Promise<Relationship> {
    const worldId = await this.resolveWorld(fromActorId, toActorId)

    return this.relationshipRepository.upsert(worldId, fromActorId, toActorId, value)
  }

  async shift(fromActorId: string, toActorId: string, delta: number): Promise<Relationship> {
    const worldId = await this.resolveWorld(fromActorId, toActorId)

    return this.relationshipRepository.shift(worldId, fromActorId, toActorId, Math.round(delta))
  }

  /** The world both actors share; the database enforces it, this only finds it and names a missing actor. */
  private async resolveWorld(fromActorId: string, toActorId: string): Promise<string> {
    const [from, to] = await Promise.all([
      this.actorRepository.findById(fromActorId),
      this.actorRepository.findById(toActorId)
    ])
    if (!from) throw new NotFoundError('Actor', fromActorId)
    if (!to) throw new NotFoundError('Actor', toActorId)

    return from.worldId
  }
}
