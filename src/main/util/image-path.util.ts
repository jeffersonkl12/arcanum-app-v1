import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import type { ImageScope } from '@constant'

/**
 * Path of a new image, relative to the images folder: `<scope>/<random uuid>.<extension>`. A new
 * name for every image (instead of one derived from the owner) means a replaced picture gets a new
 * URL, so the renderer never shows a cached old one, and a cloned owner can never share a file with
 * its source.
 */
export function buildImagePath(scope: ImageScope, extension: string): string {
  return `${scope}/${randomUUID()}.${extension}`
}

/** A fresh path in the same scope and format as `imagePath`, for the copy of an image. */
export function buildCopyImagePath(scope: ImageScope, imagePath: string): string {
  return buildImagePath(scope, extname(imagePath).slice(1))
}
