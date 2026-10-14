import { CONTEXT_TTL } from '@constant'
import type { LiveContextSection } from '../../mastra/context/live-context.context'

/** A titled group the entries are listed under. Groups appear in ascending `order`. */
export interface ContextSectionSpec {
  title: string
  order: number
}

/**
 * One piece of dynamic context a source wants in the prompt: a memory, a rumor, anything that
 * changes while the campaign runs and is not needed on every turn.
 */
export interface ContextEntry {
  /** Identity of the piece, stable across turns: reusing it refreshes the entry, a new one adds it. */
  key: string
  section: ContextSectionSpec
  /** The line the prompt shows. */
  text: string
  /** Position among the entries of its section, ascending. Entries tied keep the order they came in. */
  order?: number
  /** Turns it stays without being used; `CONTEXT_TTL_PINNED` never expires. Defaults to `CONTEXT_TTL.defaultTurns`. */
  ttlTurns?: number
}

export interface IContextWindowService {
  /**
   * Moves the scope (a world) one turn forward. `used` are the entries something used in this turn:
   * they are added, or refreshed back to their full time to live; every other entry loses one
   * turn, and the ones that reach zero leave. Returns what stays in the prompt, grouped by section.
   */
  advanceTurn(scope: string, used: readonly ContextEntry[]): LiveContextSection[]
  /**
   * Marks entries as used outside a turn's start (a tool found them mid-turn). Adds the missing
   * ones and gives the present ones their time back, keeping the section and text they already have.
   */
  touch(scope: string, used: readonly ContextEntry[]): void
  /** Forgets everything held for the scope. */
  clear(scope: string): void
}

interface Slot {
  entry: ContextEntry
  remaining: number
}

/**
 * What is in the system prompt besides the fixed layers, and for how long. Each entry has a time to
 * live counted in turns: it enters full, loses one on every turn nothing used it, goes when it
 * reaches zero and gets all of it back whenever it is used. So context that matters keeps itself
 * alive and context that stops mattering leaves on its own, without anyone deciding it must.
 *
 * It knows nothing about what an entry is. What counts as "used" is the source's call, and it can
 * only be a proxy (the text is in the prompt either way): a memory counts when the search finds it
 * relevant to what the player said, for instance. The state lives in memory: after a restart the
 * sources fill the window again from their own data, and only what they no longer find is lost.
 */
export class ContextWindowService implements IContextWindowService {
  private readonly scopes = new Map<string, Map<string, Slot>>()

  constructor(
    private readonly defaultTurns: number = CONTEXT_TTL.defaultTurns,
    private readonly maxExpiring: number = CONTEXT_TTL.maxExpiring
  ) {}

  advanceTurn(scope: string, used: readonly ContextEntry[]): LiveContextSection[] {
    const slots = this.slotsOf(scope)
    const usedKeys = new Set(used.map((entry) => entry.key))

    for (const [key, slot] of slots) {
      if (usedKeys.has(key)) continue

      slot.remaining -= 1
      if (slot.remaining <= 0) slots.delete(key)
    }
    for (const entry of used) slots.set(entry.key, { entry, remaining: this.timeToLive(entry) })

    this.dropOverflow(slots)

    return toSections(slots)
  }

  touch(scope: string, used: readonly ContextEntry[]): void {
    const slots = this.slotsOf(scope)

    for (const entry of used) {
      const present = slots.get(entry.key)
      const remaining = this.timeToLive(entry)

      if (present) present.remaining = Math.max(present.remaining, remaining)
      else slots.set(entry.key, { entry, remaining })
    }

    this.dropOverflow(slots)
  }

  clear(scope: string): void {
    this.scopes.delete(scope)
  }

  private slotsOf(scope: string): Map<string, Slot> {
    let slots = this.scopes.get(scope)
    if (!slots) {
      slots = new Map()
      this.scopes.set(scope, slots)
    }

    return slots
  }

  private timeToLive(entry: ContextEntry): number {
    return entry.ttlTurns ?? this.defaultTurns
  }

  /** Keeps the entries that can expire within `maxExpiring`, dropping the closest to expiring first. */
  private dropOverflow(slots: Map<string, Slot>): void {
    const expiring = [...slots].filter(([, slot]) => Number.isFinite(slot.remaining))
    const excess = expiring.length - this.maxExpiring
    if (excess <= 0) return

    // Stable sort: among equals the one that has been here longest goes first.
    expiring
      .sort(([, a], [, b]) => a.remaining - b.remaining)
      .slice(0, excess)
      .forEach(([key]) => slots.delete(key))
  }
}

function toSections(slots: Map<string, Slot>): LiveContextSection[] {
  const sections = new Map<string, { order: number; entries: ContextEntry[] }>()

  for (const { entry } of slots.values()) {
    const section = sections.get(entry.section.title) ?? { order: entry.section.order, entries: [] }
    section.entries.push(entry)
    sections.set(entry.section.title, section)
  }

  return [...sections]
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([title, { entries }]) => ({
      title,
      entries: entries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((entry) => entry.text)
    }))
}
