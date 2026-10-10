import type { CreateWorld } from '@schema'

/** Coarse groups used by the worlds dashboard filters. */
export type WorldGenreGroup = 'Fantasia' | 'Ficção' | 'Terror'

export const worldGenreFilters = ['Todos', 'Fantasia', 'Ficção', 'Terror'] as const

export type WorldGenreFilter = (typeof worldGenreFilters)[number]

export const worldGenreValues = [
  'fantasy',
  'high_fantasy',
  'dark_fantasy',
  'grimdark',
  'medieval',
  'mythological',
  'steampunk',
  'cyberpunk',
  'sci_fi',
  'post_apocalyptic',
  'horror',
  'western'
] as const satisfies readonly CreateWorld['genre'][]

type WorldGenreValue = (typeof worldGenreValues)[number]

export interface WorldGenreOption {
  value: WorldGenreValue
  label: string
  group: WorldGenreGroup
}

export const worldGenreOptions: readonly WorldGenreOption[] = [
  { value: 'fantasy', label: 'Fantasia', group: 'Fantasia' },
  { value: 'high_fantasy', label: 'Alta fantasia', group: 'Fantasia' },
  { value: 'dark_fantasy', label: 'Fantasia sombria', group: 'Fantasia' },
  { value: 'medieval', label: 'Medieval', group: 'Fantasia' },
  { value: 'mythological', label: 'Mitologia', group: 'Fantasia' },
  { value: 'steampunk', label: 'Steampunk', group: 'Ficção' },
  { value: 'cyberpunk', label: 'Cyberpunk', group: 'Ficção' },
  { value: 'sci_fi', label: 'Ficção científica', group: 'Ficção' },
  { value: 'western', label: 'Faroeste', group: 'Ficção' },
  { value: 'grimdark', label: 'Grimdark', group: 'Terror' },
  { value: 'post_apocalyptic', label: 'Pós-apocalíptico', group: 'Terror' },
  { value: 'horror', label: 'Terror', group: 'Terror' }
]

export function worldGenreLabel(genre: WorldGenreValue): string {
  return worldGenreOptions.find((option) => option.value === genre)?.label ?? genre
}

export function worldGenreValue(genre: string): WorldGenreValue | undefined {
  return worldGenreOptions.find((option) => option.label === genre || option.value === genre)?.value
}

export function worldGenreGroup(genre: string): WorldGenreGroup | undefined {
  return worldGenreOptions.find((option) => option.label === genre || option.value === genre)?.group
}

/** The genres a dashboard filter stands for; `undefined` for "Todos" (no filter). */
export function worldGenresOfFilter(filter: WorldGenreFilter): WorldGenreValue[] | undefined {
  if (filter === 'Todos') return undefined
  return worldGenreOptions.filter((option) => option.group === filter).map((option) => option.value)
}
