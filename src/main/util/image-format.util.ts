import { IMAGE_FORMATS, type ImageFormat } from '@constant'

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value)
}

function asciiAt(bytes: Uint8Array, text: string, offset: number): boolean {
  return startsWith(
    bytes,
    Array.from(text, (char) => char.charCodeAt(0)),
    offset
  )
}

/**
 * Identifies an image by its first bytes (magic numbers), never by a name or MIME type the sender
 * claims. Returns `undefined` when the content is not one of the accepted formats.
 */
export function detectImageFormat(bytes: Uint8Array): ImageFormat | undefined {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return IMAGE_FORMATS.png
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return IMAGE_FORMATS.jpeg
  if (asciiAt(bytes, 'GIF87a', 0) || asciiAt(bytes, 'GIF89a', 0)) return IMAGE_FORMATS.gif
  if (asciiAt(bytes, 'RIFF', 0) && asciiAt(bytes, 'WEBP', 8)) return IMAGE_FORMATS.webp

  return undefined
}
