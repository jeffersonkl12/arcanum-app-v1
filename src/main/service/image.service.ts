import { IMAGE_LIMITS, type ImageScope } from '@constant'
import { ConflictError, NotFoundError } from '@error'
import type { IImageStorage } from '@lib/image-storage.lib'
import type { IImageRepository } from '@repository/image.repository'
import { detectImageFormat } from '@util/image-format.util'
import { buildImagePath } from '@util/image-path.util'

export interface IImageService {
  /**
   * Gives the entity this image, replacing the one it had, and returns the new image path. Throws
   * `NotFoundError` when the entity is missing and `ConflictError` when the bytes are not an
   * accepted image (PNG, JPEG, WebP or GIF) or are too big.
   */
  set(id: string, data: Uint8Array): Promise<string>
  /** Removes the entity's image, if any. Throws `NotFoundError` when the entity is missing. */
  remove(id: string): Promise<void>
}

/**
 * The image of one kind of entity (`scope`): the file lives on disk, the database keeps only its
 * path. The new file is written before the path changes and the old one is deleted after, so a
 * failure never leaves the entity pointing at nothing. Files left behind by anything else (an
 * entity deleted along with its world, a crash) are collected by `ImageSweepService`.
 */
export class ImageService implements IImageService {
  constructor(
    private readonly imageRepository: IImageRepository,
    private readonly imageStorage: IImageStorage,
    private readonly scope: ImageScope,
    private readonly entityName: string
  ) {}

  async set(id: string, data: Uint8Array): Promise<string> {
    if (data.byteLength > IMAGE_LIMITS.maxBytes) {
      throw new ConflictError(
        `The image is too big (the limit is ${IMAGE_LIMITS.maxBytes / (1024 * 1024)} MB)`
      )
    }

    const format = detectImageFormat(data)

    if (!format) {
      throw new ConflictError('The file is not a PNG, JPEG, WebP or GIF image')
    }

    const previous = await this.findImagePath(id)
    const imagePath = buildImagePath(this.scope, format.extension)

    await this.imageStorage.write(imagePath, data)

    try {
      await this.imageRepository.setImagePath(id, imagePath)
    } catch (error) {
      await this.imageStorage.remove(imagePath)
      throw error
    }

    if (previous) await this.imageStorage.remove(previous)

    return imagePath
  }

  async remove(id: string): Promise<void> {
    const previous = await this.findImagePath(id)

    if (!previous) return

    await this.imageRepository.setImagePath(id, null)
    await this.imageStorage.remove(previous)
  }

  private async findImagePath(id: string): Promise<string | null> {
    const imagePath = await this.imageRepository.findImagePath(id)

    if (imagePath === undefined) {
      throw new NotFoundError(this.entityName, id)
    }

    return imagePath
  }
}
