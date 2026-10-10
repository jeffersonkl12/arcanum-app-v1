import { is } from '@electron-toolkit/utils'
import {
  createActorRoutes,
  createCultureRoutes,
  createGameMasterRoutes,
  createLanguageRoutes,
  createPartyRoutes,
  createWorldRoutes,
  isTrustedSender,
  registerIpcRoutes
} from '@ipc'
import {
  actorService,
  cultureService,
  gameMasterService,
  languageService,
  partyService,
  worldCloneService,
  worldService
} from '@module/game.module'
import { ipcMain } from 'electron'

/** Exposes the engine to the renderer. Call once, after the database is ready and before any window opens. */
export function registerIpc(): void {
  registerIpcRoutes(
    ipcMain,
    {
      ...createWorldRoutes(worldService, worldCloneService),
      ...createCultureRoutes(cultureService),
      ...createLanguageRoutes(languageService),
      ...createActorRoutes(actorService),
      ...createPartyRoutes(partyService),
      ...createGameMasterRoutes(gameMasterService)
    },
    {
      isTrustedFrameUrl: (url) =>
        isTrustedSender(url, is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined)
    }
  )
}
