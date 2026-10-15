import { is } from '@electron-toolkit/utils'
import { STUDIO } from '@constant'
import { StudioServer } from '@lib/studio-server.lib'
import { loadMastra } from '@module/mastra.module'

/** Only in development: the packaged app never opens a port. */
const studioServer = is.dev ? new StudioServer(loadMastra) : undefined

/**
 * Lets `npm run studio` show the traces, logs and threads of this running app. A failure (the port
 * is taken by `mastra dev`, say) is logged and the app goes on: observing is never worth a crash.
 */
export function startStudioServer(): void {
  studioServer?.start().then(
    () => console.log(`Mastra server for Studio on http://${STUDIO.host}:${STUDIO.serverPort}`),
    (error: unknown) => console.error('Could not start the Mastra server for Studio:', error)
  )
}

/** Frees the port; call when the app quits. */
export function stopStudioServer(): Promise<void> {
  return studioServer?.stop() ?? Promise.resolve()
}
