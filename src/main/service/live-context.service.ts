import type { IContextWindowService, ContextEntry } from '@service/context-window.service'
import type { LiveContextSection } from '../../mastra/context/live-context.context'

/** Where a kind of dynamic context comes from (the memories, ...). One source, one kind. */
export interface IContextSource {
  /**
   * The entries this turn used or found relevant, for the player's message. A source that fails
   * must answer with what it has instead of throwing: a missing memory must not cost the player a turn.
   */
  collect(worldId: string, playerMessage: string): Promise<ContextEntry[]>
}

export interface ILiveContextService {
  /** Gathers what every source used in this turn and returns the context the prompt shows. */
  prepareTurn(worldId: string, playerMessage: string): Promise<LiveContextSection[]>
  /** Forgets what is held for the world's campaign. */
  forget(worldId: string): void
}

/**
 * Puts the sources and the window together: it asks each source what the turn used and lets the
 * window age the rest. To bring another kind of dynamic context into the prompt, write a source and
 * list it where this is built.
 */
export class LiveContextService implements ILiveContextService {
  constructor(
    private readonly window: IContextWindowService,
    private readonly sources: readonly IContextSource[]
  ) {}

  async prepareTurn(worldId: string, playerMessage: string): Promise<LiveContextSection[]> {
    const used = await Promise.all(
      this.sources.map((source) => source.collect(worldId, playerMessage))
    )

    return this.window.advanceTurn(worldId, used.flat())
  }

  forget(worldId: string): void {
    this.window.clear(worldId)
  }
}
