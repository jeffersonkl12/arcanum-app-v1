import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { ActiveCampaign, WorldSummary } from '@renderer/composable/world.type'

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
  if (filter === 'Ficção') return genre === 'Sci-Fantasy' || genre === 'Ficção'
  return genre === filter
}

export function useWorld(): {
  activeCampaign: Ref<ActiveCampaign>
  visibleWorlds: ComputedRef<WorldSummary[]>
  search: Ref<string>
  genreFilter: Ref<WorldGenreFilter>
  genreFilters: typeof worldGenreFilters
} {
  return {
    activeCampaign,
    visibleWorlds,
    search,
    genreFilter,
    genreFilters: worldGenreFilters
  }
}
