import { actorTable } from '@database/entity/actor.entity'
import { itemTable } from '@database/entity/item.entity'
import { worldTable } from '@database/entity/world.entity'
import { ImageProtocol, ImageStorage, resolveImagesFolder, type IImageStorage } from '@lib'
import { database } from '@module/database.module'
import { ImageRepository } from '@repository/image.repository'
import { ImageService, type IImageService } from '@service/image.service'
import { ImageSweepService, type IImageSweepService } from '@service/image-sweep.service'

export const imageStorage: IImageStorage = new ImageStorage(resolveImagesFolder())

const actorImageRepository = new ImageRepository(database, actorTable)
const itemImageRepository = new ImageRepository(database, itemTable)
const worldImageRepository = new ImageRepository(database, worldTable)

/**
 * To give another entity an image: add its scope to `IMAGE_SCOPES`, an `image_path` column to its
 * table (kept out of its create/update schemas), an `ImageService` for it here and its repository
 * to the sweep below.
 */
export const actorImageService: IImageService = new ImageService(
  actorImageRepository,
  imageStorage,
  'actor',
  'Actor'
)

export const itemImageService: IImageService = new ImageService(
  itemImageRepository,
  imageStorage,
  'item',
  'Item'
)

export const worldImageService: IImageService = new ImageService(
  worldImageRepository,
  imageStorage,
  'world',
  'World'
)

const imageSweepService: IImageSweepService = new ImageSweepService(imageStorage, [
  { scope: 'actor', repository: actorImageRepository },
  { scope: 'item', repository: itemImageRepository },
  { scope: 'world', repository: worldImageRepository }
])

/** Declares the image scheme; must run before the app is ready. */
export function registerImageScheme(): void {
  ImageProtocol.registerScheme()
}

/** Lets the renderer load the stored images; call once the app is ready. */
export function serveImages(): void {
  new ImageProtocol(imageStorage).serve()
}

/** Deletes the image files no entity uses any more. Never fails the startup: it only frees disk. */
export async function sweepOrphanImages(): Promise<void> {
  try {
    await imageSweepService.sweep()
  } catch (error) {
    console.error('Could not sweep the unused images:', error)
  }
}
