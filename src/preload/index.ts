import { contextBridge, ipcRenderer } from 'electron'
// Not the `@shared` barrel: it also holds code with runtime dependencies (zod), and the preload
// must only carry the contract. Through the barrel they would end up `require`d here.
import type { ArcanumApi } from '@shared/api.shared'
import { IPC_CHANNELS, IPC_EVENT_CHANNELS } from '@shared/ipc-contract.shared'
import type { IpcResponse } from '@shared/ipc-response.shared'

const allowedChannels = new Set<string>(IPC_CHANNELS)
const allowedEventChannels = new Set<string>(IPC_EVENT_CHANNELS)

/**
 * Forwards a call to main, only for the channels of the contract. Never exposes `ipcRenderer`
 * itself: any code in the page could then message any channel. Resolves with an `IpcResponse`
 * in every case, because the context bridge would drop the `kind` of a rejected error.
 */
async function invoke(channel: string, input?: unknown): Promise<IpcResponse<unknown>> {
  if (!allowedChannels.has(channel)) {
    return { ok: false, error: { kind: 'forbidden', message: `Unknown channel "${channel}"` } }
  }

  try {
    return (await ipcRenderer.invoke(channel, input)) as IpcResponse<unknown>
  } catch (error) {
    // Main answers with an `IpcResponse` even on failure, so this is a transport problem.
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: { kind: 'internal', message } }
  }
}

/**
 * Subscribes to a main-to-renderer event, only for the channels of the contract. The listener gets
 * the payload alone: Electron's event object carries `sender`, which is `ipcRenderer` in disguise.
 */
function on(channel: string, listener: (payload: unknown) => void): () => void {
  if (!allowedEventChannels.has(channel)) return () => {}

  const handler = (_event: unknown, payload: unknown): void => listener(payload)
  ipcRenderer.on(channel, handler)

  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const api: ArcanumApi = {
  // The channel/input pairing is enforced by `ArcanumApi` for callers; here it is plain strings.
  invoke: invoke as ArcanumApi['invoke'],
  on: on as ArcanumApi['on'],
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

contextBridge.exposeInMainWorld('api', api)
