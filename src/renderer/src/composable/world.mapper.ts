import type { Actor, Culture, Language, World } from '@schema'
import { worldGenreLabel } from '@renderer/constant/world-genre.constant'
import type { ActorSummary, NamedEntitySummary, WorldDetail, WorldSummary } from './world.type'

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
    hpMax: actor.hpMax
  }
}

export function toNamedEntitySummary(entity: Culture | Language): NamedEntitySummary {
  return {
    id: entity.id,
    name: entity.name,
    description: entity.description
  }
}
