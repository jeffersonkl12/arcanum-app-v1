import type { IpcEventChannel, IpcEventPayload } from '@shared'
import { BrowserWindow } from 'electron'

/** Sends events to the renderer without the caller knowing about windows. */
export interface IRendererEvents {
  emit<TChannel extends IpcEventChannel>(
    channel: TChannel,
    payload: IpcEventPayload<TChannel>
  ): void
}

/**
 * Facade over Electron's `webContents.send`. There is one local player and one window, so an event
 * goes to every open window of the app; a window that is closing is skipped, because sending to a
 * destroyed `webContents` throws.
 */
export class RendererEvents implements IRendererEvents {
  emit<TChannel extends IpcEventChannel>(
    channel: TChannel,
    payload: IpcEventPayload<TChannel>
  ): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
        window.webContents.send(channel, payload)
      }
    }
  }
}
