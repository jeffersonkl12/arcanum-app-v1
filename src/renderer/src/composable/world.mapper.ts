import type { Actor, Culture, Item, Language, World } from '@schema'
import {
  clothingClassOptions,
  itemTypeOptions,
  labelOf,
  weaponClassOptions
} from '@renderer/constant/item.constant'
import { worldGenreLabel } from '@renderer/constant/world-genre.constant'
import type {
  ActorSummary,
  ItemSummary,
  NamedEntitySummary,
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
    name: entity.name,
    description: entity.description
  }
}
