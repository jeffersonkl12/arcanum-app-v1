/** Optional text the user left empty means "no value" to the engine, not an empty string. */
export function emptyToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null
}

/** Lowercase and without accents, so "Cômodo" and "comodo" are the same word when searching. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
    .trim()
}

/**
 * How well `text` matches a search `term`, best first: 0 starts with it, 1 contains it, 2 has its
 * letters in that order with others in between ("tvn" finds "Taverna"), -1 does not match. An empty
 * term matches everything equally.
 */
export function searchRank(text: string, term: string): number {
  const haystack = normalizeSearchText(text)
  const needle = normalizeSearchText(term)

  if (needle.length === 0) return 0
  if (haystack.startsWith(needle)) return 0
  if (haystack.includes(needle)) return 1

  let next = 0
  for (const letter of haystack) {
    if (letter === needle[next]) next++
    if (next === needle.length) return 2
  }
  return -1
}
