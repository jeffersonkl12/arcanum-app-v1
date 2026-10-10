import type { IpcChannel, IpcResponse } from '@shared'
import { toIpcError } from '@ipc/error.ipc'
import type { IpcRoutes, Route } from '@ipc/route.ipc'

/** The part of Electron's `ipcMain` used here, so registering routes does not need Electron. */
export interface IIpcRegistry {
  handle(
    channel: string,
    listener: (event: { senderFrame: { url: string } | null }, input: unknown) => Promise<unknown>
  ): void
}

export interface RegisterOptions {
  /** Decides, from the URL of the frame that sent a message, whether the engine may answer it. */
  isTrustedFrameUrl(url: string | undefined): boolean
}

/**
 * Registers one handler per channel. Every message goes through the same steps: check the sender,
 * validate the input, run the route, and answer with an `IpcResponse`, so a handler never throws
 * into Electron (which would drop everything but the message).
 */
export function registerIpcRoutes(
  registry: IIpcRegistry,
  routes: IpcRoutes,
  { isTrustedFrameUrl }: RegisterOptions
): void {
  // A route is typed per channel; once registered, the channel and the schema are what matter.
  const entries = Object.entries(routes) as [IpcChannel, Route<unknown, unknown>][]

  for (const [channel, { schema, run }] of entries) {
    registry.handle(channel, async (event, input): Promise<IpcResponse<unknown>> => {
      if (!isTrustedFrameUrl(event.senderFrame?.url)) {
        return { ok: false, error: { kind: 'forbidden', message: 'Untrusted sender' } }
      }

      try {
        return { ok: true, data: await run(schema.parse(input)) }
      } catch (error) {
        return { ok: false, error: toIpcError(error) }
      }
    })
  }
}
