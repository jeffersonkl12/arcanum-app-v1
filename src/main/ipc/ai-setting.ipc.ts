import { route, type RoutesOf } from '@ipc/route.ipc'
import {
  setMasterImageSchema,
  testAiConnectionSchema,
  updateAiSettingSchema
} from '@schema/ai-setting.schema'
import type { IAiConnectionService } from '@service/ai-connection.service'
import type { IAiSettingService } from '@service/ai-setting.service'
import type { IImageService } from '@service/image.service'
import { z } from 'zod'

const MASTER_IMAGE_ID = 'master'

/** `resolve` (the key in clear text) is deliberately not a route. */
export function createAiSettingRoutes(
  aiSettingService: IAiSettingService,
  aiConnectionService: IAiConnectionService,
  masterImageService: IImageService
): RoutesOf<'aiSetting'> {
  return {
    'aiSetting:catalog': route(z.undefined(), () => aiSettingService.listCatalog()),
    'aiSetting:get': route(z.undefined(), () => aiSettingService.get()),
    'aiSetting:update': route(updateAiSettingSchema, (input) => aiSettingService.update(input)),
    'aiSetting:clearApiKey': route(z.undefined(), () => aiSettingService.clearApiKey()),
    'aiSetting:clearEmbeddingApiKey': route(z.undefined(), () =>
      aiSettingService.clearEmbeddingApiKey()
    ),
    // There is one game master, so the image service gets a fixed id it does not use.
    'aiSetting:setImage': route(setMasterImageSchema, ({ data }) =>
      masterImageService.set(MASTER_IMAGE_ID, data)
    ),
    'aiSetting:removeImage': route(z.undefined(), () => masterImageService.remove(MASTER_IMAGE_ID)),
    'aiSetting:testConnection': route(testAiConnectionSchema, (input) =>
      aiConnectionService.test(input)
    )
  }
}
