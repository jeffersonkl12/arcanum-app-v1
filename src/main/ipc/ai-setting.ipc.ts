import { route, type RoutesOf } from '@ipc/route.ipc'
import { updateAiSettingSchema } from '@schema/ai-setting.schema'
import type { IAiSettingService } from '@service/ai-setting.service'
import { z } from 'zod'

/** `resolve` (the key in clear text) is deliberately not a route. */
export function createAiSettingRoutes(aiSettingService: IAiSettingService): RoutesOf<'aiSetting'> {
  return {
    'aiSetting:catalog': route(z.undefined(), () => aiSettingService.listCatalog()),
    'aiSetting:get': route(z.undefined(), () => aiSettingService.get()),
    'aiSetting:update': route(updateAiSettingSchema, (input) => aiSettingService.update(input)),
    'aiSetting:clearApiKey': route(z.undefined(), () => aiSettingService.clearApiKey()),
    'aiSetting:clearEmbeddingApiKey': route(z.undefined(), () =>
      aiSettingService.clearEmbeddingApiKey()
    )
  }
}
