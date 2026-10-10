import type {
  IpcChannel,
  IpcEventChannel,
  IpcEventPayload,
  IpcInputArgs,
  IpcOutput
} from '@shared/ipc-contract.shared'
import type { IpcResponse } from '@shared/ipc-response.shared'

/** What the preload exposes to the renderer as `window.api`. */
export interface ArcanumApi {
  /** Calls the engine in the main process. Resolves with an `IpcResponse`, never rejects. */
  invoke<TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ): Promise<IpcResponse<IpcOutput<TChannel>>>
  /**
   * Listens to an event main sends on its own (e.g. the narration of a streamed turn). Returns the
   * function that stops listening; call it when the component goes away.
   */
  on<TChannel extends IpcEventChannel>(
    channel: TChannel,
    listener: (payload: IpcEventPayload<TChannel>) => void
  ): () => void
  versions: {
    electron: string
    chrome: string
    node: string
  }
}
