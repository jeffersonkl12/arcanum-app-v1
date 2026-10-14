import { is } from '@electron-toolkit/utils'
import {
  createActorRoutes,
  createAiSettingRoutes,
  createCultureRoutes,
  createDiceRoutes,
  createGameMasterRoutes,
  createInventoryRoutes,
  createItemRoutes,
  createLanguageRoutes,
  createPartyRoutes,
  createWorldRoutes,
  isTrustedSender,
  registerIpcRoutes
} from '@ipc'
import { actorImageService, itemImageService, worldImageService } from '@module/image.module'
import {
  actorService,
  aiSettingService,
  cultureService,
  diceCheckService,
  gameMasterService,
  inventoryService,
  languageService,
  partyService,
  worldCloneService,
  worldService
} from '@module/game.module'
import { RendererEvents } from '@lib/renderer-events.lib'
import { ipcMain } from 'electron'

/** Exposes the engine to the renderer. Call once, after the database is ready and before any window opens. */
export function registerIpc(): void {
  registerIpcRoutes(
    ipcMain,
    {
      ...createWorldRoutes(worldService, worldCloneService, worldImageService),
      ...createCultureRoutes(cultureService),
      ...createDiceRoutes(diceCheckService),
      ...createLanguageRoutes(languageService),
      ...createActorRoutes(actorService, actorImageService),
      ...createInventoryRoutes(inventoryService),
      ...createItemRoutes(inventoryService, itemImageService),
      ...createPartyRoutes(partyService),
      ...createAiSettingRoutes(aiSettingService),
      ...createGameMasterRoutes(gameMasterService, new RendererEvents())
    },
    {
      isTrustedFrameUrl: (url) =>
        isTrustedSender(url, is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined)
    }
  )
}
