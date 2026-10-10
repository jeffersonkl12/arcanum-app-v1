import { pathToFileURL } from 'node:url'
import { IMAGE_PROTOCOL } from '@shared'
import type { IImageStorage } from '@lib/image-storage.lib'
import { net, protocol } from 'electron'

/**
 * Facade over Electron's `protocol`: lets the renderer show the stored images with a plain
 * `<img src="arcanum-image://local/actor/<uuid>.png">`. The renderer has no file access and
 * `file://` is avoided on purpose, so main is the only one that reads the disk, and only inside the
 * images folder.
 */
export class ImageProtocol {
  constructor(private readonly storage: IImageStorage) {}

  /** Declares the scheme. Electron only accepts it before the app is ready. */
  static registerScheme(): void {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: IMAGE_PROTOCOL,
        privileges: { standard: true, secure: true, supportFetchAPI: true }
      }
    ])
  }

  /** Starts answering requests for the scheme. Call once the app is ready. */
  serve(): void {
    protocol.handle(IMAGE_PROTOCOL, (request) => this.respond(request.url))
  }

  private async respond(requestUrl: string): Promise<Response> {
    let file: string

    try {
      const imagePath = decodeURIComponent(new URL(requestUrl).pathname).replace(/^\//, '')
      file = this.storage.resolve(imagePath)
    } catch {
      return new Response('Bad image path', { status: 400 })
    }

    // A file that no longer exists (e.g. deleted by hand) is a plain 404 for the `<img>`.
    return net
      .fetch(pathToFileURL(file).toString())
      .catch(() => new Response(null, { status: 404 }))
  }
}
