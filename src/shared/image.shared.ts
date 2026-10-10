/** Scheme main serves the stored images under; the renderer's CSP (`img-src`) must allow it. */
export const IMAGE_PROTOCOL = 'arcanum-image'

/**
 * URL the renderer puts in an `<img src>` for the `imagePath` of an entity (always relative to the
 * images folder, e.g. `actor/<uuid>.png`). The host is fixed, so the path is the only variable part.
 */
export function toImageUrl(imagePath: string): string {
  const encoded = imagePath.split('/').map(encodeURIComponent).join('/')

  return `${IMAGE_PROTOCOL}://local/${encoded}`
}
