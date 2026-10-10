interface Named {
  id: string
  name: string
}

/**
 * Finds, for each item of a world, its copy in the clone made by `world:clone`. The clone gets new
 * ids and keeps the names, so an item is matched to the first unused copy with the same name (the
 * order of the lists is the engine's, by name, which also settles repeated names).
 * Returns `sourceId -> cloneId`; an item with no copy is simply absent.
 */
export function mapClonedIds(source: Named[], clone: Named[]): Map<string, string> {
  const copiesByName = new Map<string, string[]>()
  for (const item of clone) {
    const ids = copiesByName.get(item.name) ?? []
    ids.push(item.id)
    copiesByName.set(item.name, ids)
  }

  const mapping = new Map<string, string>()
  for (const item of source) {
    const cloneId = copiesByName.get(item.name)?.shift()
    if (cloneId) mapping.set(item.id, cloneId)
  }
  return mapping
}
