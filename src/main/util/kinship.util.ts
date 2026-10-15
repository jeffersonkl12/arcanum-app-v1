// Pure, with relative imports only: `src/mastra` loads the types that depend on it.
import {
  KINSHIP_LIMITS,
  type KinshipInput,
  type KinshipKind,
  type KinshipRelation
} from '../constant/kinship.constant'

/** A stored bond. For `parent`, `fromActorId` is the parent; a `spouse` link is stored with the smaller id first. */
export interface KinshipLink {
  kind: KinshipKind
  fromActorId: string
  toActorId: string
}

/** The link that records `relativeId` as the `input` of `actorId` (`parent`: the relative is the actor's parent). */
export function toKinshipLink(
  actorId: string,
  relativeId: string,
  input: KinshipInput
): KinshipLink {
  if (input === 'parent') return { kind: 'parent', fromActorId: relativeId, toActorId: actorId }
  if (input === 'child') return { kind: 'parent', fromActorId: actorId, toActorId: relativeId }

  const [fromActorId, toActorId] = [actorId, relativeId].sort()

  return { kind: 'spouse', fromActorId, toActorId }
}

/** The relative's role to `actorId` in a stored link, as the player records it. */
export function toKinshipInput(link: KinshipLink, actorId: string): KinshipInput {
  if (link.kind === 'spouse') return 'spouse'

  return link.toActorId === actorId ? 'parent' : 'child'
}

export function linksPair(link: KinshipLink, aId: string, bId: string): boolean {
  return (
    (link.fromActorId === aId && link.toActorId === bId) ||
    (link.fromActorId === bId && link.toActorId === aId)
  )
}

/** The family tree as lookups over the stored links. */
class KinshipGraph {
  private readonly parentsByChild = new Map<string, string[]>()
  private readonly childrenByParent = new Map<string, string[]>()
  private readonly spouses = new Map<string, string>()

  constructor(links: readonly KinshipLink[]) {
    for (const { kind, fromActorId, toActorId } of links) {
      if (kind === 'spouse') {
        this.spouses.set(fromActorId, toActorId)
        this.spouses.set(toActorId, fromActorId)
        continue
      }

      push(this.parentsByChild, toActorId, fromActorId)
      push(this.childrenByParent, fromActorId, toActorId)
    }
  }

  parents(id: string): string[] {
    return this.parentsByChild.get(id) ?? []
  }

  children(id: string): string[] {
    return this.childrenByParent.get(id) ?? []
  }

  spouse(id: string): string | undefined {
    return this.spouses.get(id)
  }

  /** Whether `ancestorId` is a parent, grandparent... of `id`. */
  isAncestor(ancestorId: string, id: string): boolean {
    const pending = [...this.parents(id)]
    const seen = new Set<string>()

    while (pending.length > 0) {
      const current = pending.pop()!
      if (current === ancestorId) return true
      if (seen.has(current)) continue

      seen.add(current)
      pending.push(...this.parents(current))
    }

    return false
  }

  /** Who shares at least one parent with `id`, and whether they share all of them. */
  siblings(id: string): { fullIds: string[]; halfIds: string[] } {
    const mine = new Set(this.parents(id))
    const others = new Set(
      [...mine].flatMap((parentId) => this.children(parentId)).filter((other) => other !== id)
    )
    const fullIds: string[] = []
    const halfIds: string[] = []

    for (const other of others) {
      const theirs = this.parents(other)
      const sameParents =
        theirs.length === mine.size && theirs.every((parentId) => mine.has(parentId))
      ;(sameParents ? fullIds : halfIds).push(other)
    }

    return { fullIds, halfIds }
  }

  bloodSiblings(id: string): string[] {
    const { fullIds, halfIds } = this.siblings(id)

    return [...fullIds, ...halfIds]
  }
}

function push(map: Map<string, string[]>, key: string, value: string): void {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

/**
 * Why `candidate` cannot join `links`, or `undefined` when it can. The caller leaves out the link the
 * candidate replaces (editing a bond), so the candidate is judged against the rest of the family.
 */
export function findKinshipConflict(
  links: readonly KinshipLink[],
  candidate: KinshipLink
): string | undefined {
  const { kind, fromActorId, toActorId } = candidate
  if (fromActorId === toActorId) return 'An actor cannot be related to themselves'
  if (links.some((link) => linksPair(link, fromActorId, toActorId))) {
    return 'These two actors are already linked'
  }

  const graph = new KinshipGraph(links)
  if (graph.isAncestor(fromActorId, toActorId) || graph.isAncestor(toActorId, fromActorId)) {
    return kind === 'parent'
      ? 'A descendant cannot be the parent of their own ancestor'
      : 'Ancestors and descendants cannot be spouses'
  }

  if (kind === 'parent') {
    return graph.parents(toActorId).length >= KINSHIP_LIMITS.maxParents
      ? `An actor has at most ${KINSHIP_LIMITS.maxParents} parents`
      : undefined
  }

  return graph.spouse(fromActorId) || graph.spouse(toActorId)
    ? `An actor has at most ${KINSHIP_LIMITS.maxSpouses} spouse`
    : undefined
}

/** Everyone related to `actorId` and how, derived from the direct bonds. Each relative has the closest relation only. */
export function deriveRelatives(
  links: readonly KinshipLink[],
  actorId: string
): { actorId: string; relation: KinshipRelation }[] {
  const graph = new KinshipGraph(links)
  const found = new Map<string, KinshipRelation>()
  const add = (ids: Iterable<string>, relation: KinshipRelation): void => {
    for (const id of ids) if (id !== actorId && !found.has(id)) found.set(id, relation)
  }
  const unique = (ids: string[]): string[] => [...new Set(ids)]

  const parents = graph.parents(actorId)
  const children = graph.children(actorId)
  const spouseId = graph.spouse(actorId)
  const siblings = graph.siblings(actorId)
  const allSiblings = [...siblings.fullIds, ...siblings.halfIds]
  const uncles = unique(parents.flatMap((id) => graph.bloodSiblings(id)))

  add(parents, 'parent')
  add(children, 'child')
  add(spouseId ? [spouseId] : [], 'spouse')
  add(siblings.fullIds, 'sibling')
  add(siblings.halfIds, 'half_sibling')
  add(
    parents.flatMap((id) => graph.spouse(id) ?? []),
    'step_parent'
  )
  add(spouseId ? graph.children(spouseId) : [], 'step_child')
  add(
    parents.flatMap((id) => graph.parents(id)),
    'grandparent'
  )
  add(
    children.flatMap((id) => graph.children(id)),
    'grandchild'
  )
  add(uncles, 'uncle_aunt')
  add(
    allSiblings.flatMap((id) => graph.children(id)),
    'nibling'
  )
  add(
    uncles.flatMap((id) => graph.children(id)),
    'cousin'
  )
  add(spouseId ? graph.parents(spouseId) : [], 'parent_in_law')
  add(
    children.flatMap((id) => graph.spouse(id) ?? []),
    'child_in_law'
  )
  add(
    [
      ...(spouseId ? graph.bloodSiblings(spouseId) : []),
      ...allSiblings.flatMap((id) => graph.spouse(id) ?? [])
    ],
    'sibling_in_law'
  )

  return [...found].map(([id, relation]) => ({ actorId: id, relation }))
}

const LABELS: Record<KinshipRelation, { male: string; female: string }> = {
  parent: { male: 'father', female: 'mother' },
  child: { male: 'son', female: 'daughter' },
  spouse: { male: 'husband', female: 'wife' },
  sibling: { male: 'brother', female: 'sister' },
  half_sibling: { male: 'half-brother', female: 'half-sister' },
  step_parent: { male: 'stepfather', female: 'stepmother' },
  step_child: { male: 'stepson', female: 'stepdaughter' },
  grandparent: { male: 'grandfather', female: 'grandmother' },
  grandchild: { male: 'grandson', female: 'granddaughter' },
  uncle_aunt: { male: 'uncle', female: 'aunt' },
  nibling: { male: 'nephew', female: 'niece' },
  cousin: { male: 'cousin', female: 'cousin' },
  parent_in_law: { male: 'father-in-law', female: 'mother-in-law' },
  child_in_law: { male: 'son-in-law', female: 'daughter-in-law' },
  sibling_in_law: { male: 'brother-in-law', female: 'sister-in-law' }
}

/** The English word for the relative (`mother`, `half-brother`), by the relative's gender; for the prompt. */
export function describeKinship(relation: KinshipRelation, gender: string): string {
  return LABELS[relation][gender === 'female' ? 'female' : 'male']
}

/** A relative as the prompt cites it: enough to name them, place them in the family and act on them by id. */
export interface PromptRelative {
  id: string
  name: string
  /** The English word for the bond (`mother`, `half-brother`). */
  relation: string
  age: string
}

/** `Mara (mother, adult, id: ...)`. */
export function formatRelative(relative: PromptRelative): string {
  return `${relative.name} (${relative.relation}, ${relative.age}, id: ${relative.id})`
}
