import type { IpcChannel, IpcInputArgs, IpcOutput } from '@shared/ipc-contract.shared'
import type { IpcResponse } from '@shared/ipc-response.shared'

/** What the preload exposes to the renderer as `window.api`. */
export interface ArcanumApi {
  /** Calls the engine in the main process. Resolves with an `IpcResponse`, never rejects. */
  invoke<TChannel extends IpcChannel>(
    channel: TChannel,
    ...input: IpcInputArgs<TChannel>
  ): Promise<IpcResponse<IpcOutput<TChannel>>>
  versions: {
    electron: string
    chrome: string
    node: string
  }
}
