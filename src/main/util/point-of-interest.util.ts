/** The part of a place that says where it sits in the tree. */
interface Placed {
  id: string
  parentId: string | null
}

/**
 * What `place` is inside of, nearest first. Stops if the data ever loops or a parent is missing, so
 * it cannot hang.
 */
export function ancestorsOf<TPlace extends Placed>(
  place: TPlace,
  placesById: ReadonlyMap<string, TPlace>
): TPlace[] {
  const ancestors: TPlace[] = []
  const seen = new Set([place.id])
  let current = place

  while (current.parentId !== null) {
    const parent = placesById.get(current.parentId)

    if (!parent || seen.has(parent.id)) break

    ancestors.push(parent)
    seen.add(parent.id)
    current = parent
  }

  return ancestors
}
