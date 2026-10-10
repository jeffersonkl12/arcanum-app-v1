import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type ArcanumApi, type IpcResponse } from '@shared'

const allowedChannels = new Set<string>(IPC_CHANNELS)

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

const api: ArcanumApi = {
  // The channel/input pairing is enforced by `ArcanumApi` for callers; here it is plain strings.
  invoke: invoke as ArcanumApi['invoke'],
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  }
}

contextBridge.exposeInMainWorld('api', api)
