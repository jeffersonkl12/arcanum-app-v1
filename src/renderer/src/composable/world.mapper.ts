import type { World } from '@schema'
import { worldGenreLabel } from '@renderer/constant/world-genre.constant'
import type { WorldSummary } from './world.type'

export function toWorldSummary(world: World): WorldSummary {
  return {
    id: world.id,
    name: world.name,
    description: world.description,
    genre: worldGenreLabel(world.genre),
    // Proposed: world:list has no campaign count, so a world just created shows zero.
    campaignCount: 0
  }
}
