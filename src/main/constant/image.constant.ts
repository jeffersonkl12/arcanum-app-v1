/**
 * Kinds of entity that can own an image. Each one has its own subfolder of the images folder, and
 * is the first segment of a stored image path (`actor/<uuid>.png`).
 */
export const IMAGE_SCOPES = ['actor', 'item', 'world', 'master', 'point-of-interest'] as const

export type ImageScope = (typeof IMAGE_SCOPES)[number]

/** Formats accepted for an image; SVG is left out on purpose, because it can carry scripts. */
export const IMAGE_FORMATS = {
  png: { extension: 'png', mimeType: 'image/png' },
  jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
  webp: { extension: 'webp', mimeType: 'image/webp' },
  gif: { extension: 'gif', mimeType: 'image/gif' }
} as const

export type ImageFormatName = keyof typeof IMAGE_FORMATS

export type ImageFormat = (typeof IMAGE_FORMATS)[ImageFormatName]

export const IMAGE_LIMITS = {
  maxBytes: 5 * 1024 * 1024
} as const
