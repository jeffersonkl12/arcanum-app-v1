import type { Actor, Culture, Item, Language, PointOfInterest, World, WorldDocument } from '@schema'
import {
  clothingClassOptions,
  itemTypeOptions,
  labelOf,
  weaponClassOptions
} from '@renderer/constant/item.constant'
import { worldGenreLabel } from '@renderer/constant/world-genre.constant'
import type {
  ActorSummary,
  DocumentSummary,
  ItemSummary,
  LanguageSummary,
  NamedEntitySummary,
  PlaceSummary,
  WorldDetail,
  WorldSummary
} from './world.type'

export function toWorldSummary(world: World, campaignCount: number): WorldSummary {
  return {
    id: world.id,
    name: world.name,
    description: world.description,
    genre: worldGenreLabel(world.genre),
    imagePath: world.imagePath,
    campaignCount
  }
}

export function toWorldDetail(world: World): WorldDetail {
  return {
    id: world.id,
    isTemplate: world.isTemplate,
    name: world.name,
    description: world.description,
    genre: worldGenreLabel(world.genre),
    imagePath: world.imagePath
  }
}

export function toActorSummary(actor: Actor, cultures: NamedEntitySummary[]): ActorSummary {
  const cultureName = cultures.find((culture) => culture.id === actor.cultureId)?.name
  const subtitle = [actor.profession, cultureName].filter(Boolean).join(' • ')

  return {
    id: actor.id,
    name: actor.name,
    subtitle: subtitle || (actor.isNpc ? 'NPC' : 'Jogador'),
    imagePath: actor.imagePath,
    profession: actor.profession ?? '',
    age: actor.age,
    gender: actor.gender,
    languageId: actor.languageId,
    cultureId: actor.cultureId,
    pointOfInterestId: actor.pointOfInterestId,
    appearance: actor.appearance ?? '',
    personality: actor.personality ?? '',
    background: actor.background ?? '',
    hpCurrent: actor.hpCurrent,
    hpMax: actor.hpMax,
    strength: actor.strength,
    dexterity: actor.dexterity,
    intelligence: actor.intelligence,
    goldPieces: actor.goldPieces,
    silverPieces: actor.silverPieces,
    bronzePieces: actor.bronzePieces
  }
}

export function toItemSummary(item: Item): ItemSummary {
  const tags = [labelOf(itemTypeOptions, item.type)]

  if (item.weaponClass) tags.push(labelOf(weaponClassOptions, item.weaponClass))
  if (item.clothingClass) tags.push(labelOf(clothingClassOptions, item.clothingClass))

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    imagePath: item.imagePath,
    type: item.type,
    slots: item.slots,
    goldPieces: item.goldPieces,
    silverPieces: item.silverPieces,
    bronzePieces: item.bronzePieces,
    weaponClass: item.weaponClass,
    clothingClass: item.clothingClass,
    tags,
    isCarried: item.actorId !== null,
    isEquipped: item.equippedSlot !== null
  }
}

export function toNamedEntitySummary(entity: Culture | Language): NamedEntitySummary {
  return {
    id: entity.id,
    name: entity.name
  }
}

export function toDocumentSummary(entry: WorldDocument): DocumentSummary {
  return {
    id: entry.id,
    subject: entry.subject,
    category: entry.category,
    content: entry.content
  }
}

export function toLanguageSummary(language: Language): LanguageSummary {
  return { id: language.id, name: language.name, cultureId: language.cultureId }
}

/** The places in tree order (each one right under its parent, siblings by name), with their depth and path. */
export function toPlaceSummaries(places: PointOfInterest[]): PlaceSummary[] {
  const childrenOf = new Map<string | null, PointOfInterest[]>()
  for (const place of places) {
    const siblings = childrenOf.get(place.parentId) ?? []
    siblings.push(place)
    childrenOf.set(place.parentId, siblings)
  }

  const summaries: PlaceSummary[] = []
  const visit = (place: PointOfInterest, path: string[]): void => {
    const children = (childrenOf.get(place.id) ?? []).sort(byName)
    summaries.push({
      id: place.id,
      name: place.name,
      type: place.type,
      description: place.description,
      imagePath: place.imagePath,
      parentId: place.parentId,
      depth: path.length,
      path,
      childCount: children.length
    })
    for (const child of children) visit(child, [...path, place.name])
  }

  for (const root of (childrenOf.get(null) ?? []).sort(byName)) visit(root, [])
  return summaries
}

function byName(a: PointOfInterest, b: PointOfInterest): number {
  return a.name.localeCompare(b.name)
}
