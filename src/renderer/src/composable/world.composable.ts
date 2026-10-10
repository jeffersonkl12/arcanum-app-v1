import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { CreateWorld } from '@schema'
import type { IpcError } from '@shared'
import { worldGenreGroup } from '@renderer/constant/world-genre.constant'
import { useRequest } from './request.composable'
import { toWorldSummary } from './world.mapper'
import type { ActiveCampaign, WorldSummary } from './world.type'

export const worldGenreFilters = ['Todos', 'Fantasia', 'Ficção', 'Terror'] as const

export type WorldGenreFilter = (typeof worldGenreFilters)[number]

// Proposed: campaign:getActive is not in ipcContract yet.
const activeCampaign = ref<ActiveCampaign>({
  id: 'shattered-realms',
  title: 'Os Reinos Despedaçados'
})

// Proposed: world:list has no campaign count. Dashboard stays mocked until that model exists.
const worlds = ref<WorldSummary[]>([
  {
    id: 'eldoria',
    name: 'Eldoria',
    description:
      'Um mundo de alta magia com cidades flutuantes e antigos senhores dragões despertando de seu sono.',
    genre: 'Fantasia',
    campaignCount: 2
  },
  {
    id: 'neo-veridia',
    name: 'Neo-Veridia',
    description:
      'Metrópole cyberpunk construída nas ruínas de uma civilização élfica. A magia encontra o cromo.',
    genre: 'Sci-Fantasy',
    campaignCount: 0
  },
  {
    id: 'dead-wastes',
    name: 'Os Ermos Mortos',
    description:
      'Ermos pós-apocalípticos onde sobreviventes buscam tecnologia e lutam contra horrores mutantes.',
    genre: 'Terror',
    campaignCount: 2
  }
])

const search = ref('')
const genreFilter = ref<WorldGenreFilter>('Todos')

const visibleWorlds = computed(() =>
  worlds.value.filter((world) => {
    const term = search.value.trim().toLocaleLowerCase()
    const matchesSearch = term.length === 0 || world.name.toLocaleLowerCase().includes(term)
    return matchesSearch && matchesGenre(world.genre, genreFilter.value)
  })
)

function matchesGenre(genre: string, filter: WorldGenreFilter): boolean {
  if (filter === 'Todos') return true
  const group = worldGenreGroup(genre)
  if (group) return group === filter
  if (filter === 'Ficção') return genre === 'Sci-Fantasy' || genre === 'Ficção'
  return genre === filter
}

const { isLoading: isCreating, error: createError, request } = useRequest()

async function createWorld(input: CreateWorld): Promise<WorldSummary | undefined> {
  const created = await request('world:create', input)
  if (!created) return undefined
  const summary = toWorldSummary(created)
  worlds.value = [summary, ...worlds.value]
  return summary
}

export function useWorld(): {
  activeCampaign: Ref<ActiveCampaign>
  visibleWorlds: ComputedRef<WorldSummary[]>
  search: Ref<string>
  genreFilter: Ref<WorldGenreFilter>
  genreFilters: typeof worldGenreFilters
  isCreating: Ref<boolean>
  createError: Ref<IpcError | undefined>
  createWorld: (input: CreateWorld) => Promise<WorldSummary | undefined>
} {
  return {
    activeCampaign,
    visibleWorlds,
    search,
    genreFilter,
    genreFilters: worldGenreFilters,
    isCreating,
    createError,
    createWorld
  }
}
