import { is } from '@electron-toolkit/utils'
import {
  createActorRoutes,
  createAiSettingRoutes,
  createCultureRoutes,
  createGameMasterRoutes,
  createLanguageRoutes,
  createPartyRoutes,
  createWorldRoutes,
  isTrustedSender,
  registerIpcRoutes
} from '@ipc'
import { actorImageService, worldImageService } from '@module/image.module'
import {
  actorService,
  aiSettingService,
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
      ...createWorldRoutes(worldService, worldCloneService, worldImageService),
      ...createCultureRoutes(cultureService),
      ...createLanguageRoutes(languageService),
      ...createActorRoutes(actorService, actorImageService),
      ...createPartyRoutes(partyService),
      ...createAiSettingRoutes(aiSettingService),
      ...createGameMasterRoutes(gameMasterService)
    },
    {
      isTrustedFrameUrl: (url) =>
        isTrustedSender(url, is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined)
    }
  )
}
