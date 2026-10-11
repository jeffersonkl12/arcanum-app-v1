import { relative, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DICE_ASSETS_PROTOCOL } from '@shared'
import { net, protocol } from 'electron'

/**
 * Facade over Electron's `protocol`: serves the 3D dice assets (WASM, themes, textures) to the
 * packaged renderer, which is loaded from `file://` where `fetch` of local files is blocked. Main
 * reads the disk, and only inside the assets folder. In development the Vite server serves them.
 */
export class DiceAssetsProtocol {
  constructor(private readonly folder: string) {}

  /** Declares the scheme. Electron only accepts it before the app is ready. */
  static registerScheme(): void {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: DICE_ASSETS_PROTOCOL,
        // The physics worker runs from a blob, so its requests are cross-origin.
        privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true }
      }
    ])
  }

  /** Starts answering requests for the scheme. Call once the app is ready. */
  serve(): void {
    protocol.handle(DICE_ASSETS_PROTOCOL, (request) => this.respond(request.url))
  }

  private async respond(requestUrl: string): Promise<Response> {
    const file = resolve(this.folder, decodeURIComponent(new URL(requestUrl).pathname).slice(1))
    const inside = relative(this.folder, file)
    if (inside.startsWith('..') || inside.includes(`..${sep}`)) {
      return new Response('Bad asset path', { status: 400 })
    }

    const response = await net
      .fetch(pathToFileURL(file).toString())
      .catch(() => new Response(null, { status: 404 }))
    const headers = new Headers(response.headers)
    headers.set('Access-Control-Allow-Origin', '*')

    return new Response(response.body, { status: response.status, headers })
  }
}
