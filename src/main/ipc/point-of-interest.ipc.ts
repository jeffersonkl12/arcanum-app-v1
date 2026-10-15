import { idSchema, updateInput } from '@ipc/common.ipc'
import { route, type RoutesOf } from '@ipc/route.ipc'
import { createPointOfInterestSchema, setImageSchema, updatePointOfInterestSchema } from '@schema'
import type { IImageService } from '@service/image.service'
import type { IPointOfInterestService } from '@service/point-of-interest.service'
import { z } from 'zod'

const listChildrenSchema = z.object({ worldId: idSchema, parentId: idSchema.nullable() })

export function createPointOfInterestRoutes(
  pointOfInterestService: IPointOfInterestService,
  pointOfInterestImageService: IImageService
): RoutesOf<'pointOfInterest'> {
  return {
    'pointOfInterest:listByWorld': route(idSchema, (worldId) =>
      pointOfInterestService.listByWorld(worldId)
    ),
    'pointOfInterest:listChildren': route(listChildrenSchema, ({ worldId, parentId }) =>
      pointOfInterestService.listChildren(worldId, parentId)
    ),
    'pointOfInterest:getPath': route(idSchema, (id) => pointOfInterestService.getPath(id)),
    'pointOfInterest:get': route(idSchema, (id) => pointOfInterestService.get(id)),
    'pointOfInterest:create': route(createPointOfInterestSchema, (input) =>
      pointOfInterestService.create(input)
    ),
    'pointOfInterest:update': route(updateInput(updatePointOfInterestSchema), ({ id, patch }) =>
      pointOfInterestService.update(id, patch)
    ),
    'pointOfInterest:delete': route(idSchema, (id) => pointOfInterestService.delete(id)),
    'pointOfInterest:setImage': route(setImageSchema, ({ id, data }) =>
      pointOfInterestImageService.set(id, data)
    ),
    'pointOfInterest:removeImage': route(idSchema, (id) => pointOfInterestImageService.remove(id))
  }
}
