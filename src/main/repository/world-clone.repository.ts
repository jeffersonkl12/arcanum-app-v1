import { randomUUID } from 'node:crypto'
import type { ImageScope } from '@constant'
import type { Database } from '@database/client.database'
import { actorTable } from '@database/entity/actor.entity'
import { cultureTable } from '@database/entity/culture.entity'
import { itemTable } from '@database/entity/item.entity'
import { languageTable } from '@database/entity/language.entity'
import { documentTable } from '@database/entity/document.entity'
import { partyTable } from '@database/entity/party.entity'
import { pointOfInterestTable } from '@database/entity/point-of-interest.entity'
import { kinshipTable } from '@database/entity/kinship.entity'
import { relationshipTable } from '@database/entity/relationship.entity'
import { worldTable } from '@database/entity/world.entity'
import { translateDatabaseError } from '@database/error.database'
import type { World } from '@schema/world.schema'
import { buildCopyImagePath } from '@util/image-path.util'

/** An image file the copy of a world needs: the rows already point to `to`, but the file is not there yet. */
export interface ImageCopy {
  from: string
  to: string
}

export interface WorldClone {
  world: World
  imageCopies: ImageCopy[]
}

export interface IWorldCloneRepository {
  /**
   * Copies a world and everything that belongs to it, (cultures, languages, party, actors, the relationships and the family bonds
   * between them, places, documents, with their links) into a new, non-template world, all or nothing. Returns `undefined` when the
   * source world does not exist. The campaign is never copied: it only exists in a non-template world, and the copy starts without one. The database cannot copy files, so the images come back as
   * `imageCopies` for the caller to copy once the transaction has committed.
   */
  clone(sourceWorldId: string, name?: string): Promise<WorldClone | undefined>
}

/** Rows of one entity copied into the new world, and how the old ids map to the new ones. */
interface Copy<TRow> {
  rows: TRow[]
  newIds: ReadonlyMap<string, string>
}

export class WorldCloneRepository implements IWorldCloneRepository {
  constructor(private readonly database: Database) {}

  async clone(sourceWorldId: string, name?: string): Promise<WorldClone | undefined> {
    try {
      return await this.database.transaction(async (tx) => {
        const source = await tx.query.world.findFirst({ where: { id: sourceWorldId } })
        if (!source) return undefined

        const imageCopies: ImageCopy[] = []

        const [world] = await tx
          .insert(worldTable)
          .values({
            ...source,
            id: randomUUID(),
            name: name ?? source.name,
            isTemplate: false,
            // A copy of a campaign still points to the template it came from.
            sourceWorldId: source.isTemplate ? source.id : source.sourceWorldId,
            imagePath: copyImagePath('world', source.imagePath, imageCopies)
          })
          .returning()

        const where = { worldId: sourceWorldId }
        const cultures = copyInto(world.id, await tx.query.culture.findMany({ where }))
        const languages = copyInto(world.id, await tx.query.language.findMany({ where }))
        const parties = copyInto(world.id, await tx.query.party.findMany({ where }))
        const actors = copyInto(world.id, await tx.query.actor.findMany({ where }))
        const places = copyInto(world.id, await tx.query.pointOfInterest.findMany({ where }))

        // Actors point to the other four through composite foreign keys, so those go in first.
        // Drizzle rejects an insert without rows, hence the guards.
        if (cultures.rows.length > 0) await tx.insert(cultureTable).values(cultures.rows)
        if (languages.rows.length > 0)
          await tx.insert(languageTable).values(
            languages.rows.map((language) => ({
              ...language,
              cultureId: cultures.newIds.get(language.cultureId) ?? language.cultureId
            }))
          )
        if (parties.rows.length > 0) await tx.insert(partyTable).values(parties.rows)
        // Places point to their parent in the same table; the foreign key is checked once the whole
        // statement has run, so the order of the rows does not matter.
        if (places.rows.length > 0) {
          await tx.insert(pointOfInterestTable).values(
            places.rows.map((place) => ({
              ...place,
              parentId: remapId(places.newIds, place.parentId),
              imagePath: copyImagePath('point-of-interest', place.imagePath, imageCopies)
            }))
          )
        }
        if (actors.rows.length > 0) {
          await tx.insert(actorTable).values(
            actors.rows.map((actor) => ({
              ...actor,
              cultureId: remapId(cultures.newIds, actor.cultureId),
              languageId: remapId(languages.newIds, actor.languageId),
              partyId: remapId(parties.newIds, actor.partyId),
              pointOfInterestId: remapId(places.newIds, actor.pointOfInterestId),
              imagePath: copyImagePath('actor', actor.imagePath, imageCopies)
            }))
          )
        }

        // Items go in after the actors that carry them (composite foreign key).
        const items = copyInto(world.id, await tx.query.item.findMany({ where }))
        if (items.rows.length > 0) {
          await tx.insert(itemTable).values(
            items.rows.map((item) => ({
              ...item,
              actorId: remapId(actors.newIds, item.actorId),
              imagePath: copyImagePath('item', item.imagePath, imageCopies)
            }))
          )
        }

        // Relationships go in after the two actors they link (composite foreign keys).
        const relationships = copyInto(world.id, await tx.query.relationship.findMany({ where }))
        if (relationships.rows.length > 0) {
          await tx.insert(relationshipTable).values(
            relationships.rows.map((relationship) => ({
              ...relationship,
              fromActorId: actors.newIds.get(relationship.fromActorId)!,
              toActorId: actors.newIds.get(relationship.toActorId)!
            }))
          )
        }

        // Family bonds go in after the two actors they link (composite foreign keys).
        const kinships = copyInto(world.id, await tx.query.kinship.findMany({ where }))
        if (kinships.rows.length > 0) {
          await tx.insert(kinshipTable).values(
            kinships.rows.map((kinship) => ({
              ...kinship,
              fromActorId: actors.newIds.get(kinship.fromActorId)!,
              toActorId: actors.newIds.get(kinship.toActorId)!
            }))
          )
        }

        // Documents have no links to the other entities, so it only needs new ids in the new world.
        const documents = copyInto(world.id, await tx.query.document.findMany({ where }))
        if (documents.rows.length > 0) await tx.insert(documentTable).values(documents.rows)

        return { world, imageCopies }
      })
    } catch (error) {
      throw translateDatabaseError(error)
    }
  }
}

/**
 * Gives every row a new id in the new world. The row is spread, so a column added to an entity
 * later is copied without touching this file.
 */
function copyInto<TRow extends { id: string; worldId: string }>(
  worldId: string,
  sourceRows: TRow[]
): Copy<TRow> {
  const newIds = new Map(sourceRows.map((row) => [row.id, randomUUID()]))
  const rows = sourceRows.map((row) => ({ ...row, id: newIds.get(row.id)!, worldId }))

  return { rows, newIds }
}

/** The id an optional link must point to in the copy. A missing target would be a bug here: the composite foreign keys keep every link inside its world. */
function remapId(newIds: ReadonlyMap<string, string>, id: string | null): string | null {
  if (id === null) return null

  const newId = newIds.get(id)
  if (newId === undefined) throw new Error(`Cannot clone: "${id}" is not part of the source world`)

  return newId
}

/** The path the copy of an entity's image will have, noted in `imageCopies` so the file gets copied. */
function copyImagePath(
  scope: ImageScope,
  imagePath: string | null,
  imageCopies: ImageCopy[]
): string | null {
  if (imagePath === null) return null

  const copyPath = buildCopyImagePath(scope, imagePath)
  imageCopies.push({ from: imagePath, to: copyPath })

  return copyPath
}
