export const WORLD_GENRES = [
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
] as const

export type WorldGenre = (typeof WORLD_GENRES)[number]
