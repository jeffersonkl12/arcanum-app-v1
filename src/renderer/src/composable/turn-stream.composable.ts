import { toast } from 'vue-sonner'
import type { IpcError, NarrationDeltaEvent, NarrationDoneEvent } from '@shared'
import { translateIpcError } from '@renderer/util/ipc-error.util'

export interface TurnHandlers {
  /** The new text of one segment of the reply. */
  onDelta: (event: NarrationDeltaEvent) => void
  /** The reply is complete; its segments replace whatever was accumulated. */
  onDone: (event: NarrationDoneEvent) => void
  /** The turn did not start or did not finish. The user has already been told. */
  onError: (error: IpcError) => void
}

/**
 * Plays one turn through `gameMaster:streamTurn` and resolves when it is over (`done` or `error`).
 * The id that ties the events to the turn is picked here, and the listener is on before the call,
 * because the first event can arrive before the call resolves.
 */
export function useTurnStream(): {
  streamTurn: (input: { worldId: string; message: string }, handlers: TurnHandlers) => Promise<void>
} {
  async function streamTurn(
    input: { worldId: string; message: string },
    handlers: TurnHandlers
  ): Promise<void> {
    const turnId = crypto.randomUUID()
    let finish!: () => void
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })

    function fail(error: IpcError): void {
      // `internal` hides the cause on purpose; the first suspect is the key of the AI provider.
      toast.error(translateIpcError(error), {
        description:
          error.kind === 'internal'
            ? 'Confira o provedor e a chave de API em Configurações.'
            : undefined
      })
      handlers.onError(error)
    }

    const stop = window.api.on('gameMaster:turnEvent', (event) => {
      if (event.turnId !== turnId) return
      if (event.type === 'delta') {
        handlers.onDelta(event)
        return
      }

      stop()
      if (event.type === 'done') handlers.onDone(event)
      else fail(event.error)
      finish()
    })

    const response = await window.api.invoke('gameMaster:streamTurn', { turnId, ...input })
    if (!response.ok) {
      // Refused before it began (`conflict` if the world already has a turn running).
      stop()
      fail(response.error)
      return
    }

    await finished
  }

  return { streamTurn }
}
