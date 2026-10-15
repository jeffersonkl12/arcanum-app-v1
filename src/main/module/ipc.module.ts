import { is } from '@electron-toolkit/utils'
import {
  createActorRoutes,
  createAiSettingRoutes,
  createCampaignRoutes,
  createCultureRoutes,
  createDiceRoutes,
  createGameMasterRoutes,
  createInventoryRoutes,
  createItemRoutes,
  createKinshipRoutes,
  createLanguageRoutes,
  createDocumentRoutes,
  createMemoryRoutes,
  createPartyRoutes,
  createPointOfInterestRoutes,
  createRelationshipRoutes,
  createWorldRoutes,
  isTrustedSender,
  registerIpcRoutes
} from '@ipc'
import {
  actorImageService,
  itemImageService,
  masterImageService,
  pointOfInterestImageService,
  worldImageService
} from '@module/image.module'
import {
  actorService,
  aiConnectionService,
  aiSettingService,
  campaignService,
  cultureService,
  diceCheckService,
  gameMasterService,
  inventoryService,
  kinshipService,
  languageService,
  documentService,
  memoryService,
  partyService,
  pointOfInterestService,
  relationshipService,
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
      ...createDocumentRoutes(documentService),
      ...createActorRoutes(actorService, actorImageService, kinshipService),
      ...createInventoryRoutes(inventoryService),
      ...createItemRoutes(inventoryService, itemImageService),
      ...createPartyRoutes(partyService),
      ...createKinshipRoutes(kinshipService),
      ...createRelationshipRoutes(relationshipService),
      ...createMemoryRoutes(memoryService),
      ...createPointOfInterestRoutes(pointOfInterestService, pointOfInterestImageService),
      ...createCampaignRoutes(campaignService),
      ...createAiSettingRoutes(aiSettingService, aiConnectionService, masterImageService),
      ...createGameMasterRoutes(gameMasterService, new RendererEvents())
    },
    {
      isTrustedFrameUrl: (url) =>
        isTrustedSender(url, is.dev ? process.env['ELECTRON_RENDERER_URL'] : undefined)
    }
  )
}
