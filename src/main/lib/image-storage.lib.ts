import { copyFile, mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import type { ImageScope } from '@constant'
import { ConflictError } from '@error'

export interface IImageStorage {
  /** Absolute path of a stored image. Throws `ConflictError` when `imagePath` leaves the images folder. */
  resolve(imagePath: string): string
  /** Stores the bytes at `imagePath` (relative to the images folder); a crash never leaves half a file. */
  write(imagePath: string, data: Uint8Array): Promise<void>
  /** Copies a stored image to another path. */
  copy(fromPath: string, toPath: string): Promise<void>
  /** Deletes an image; a file that is already gone is not an error. */
  remove(imagePath: string): Promise<void>
  /** Paths of every file stored for a scope, referenced or not. */
  list(scope: ImageScope): Promise<string[]>
}

/**
 * Images on disk, under one folder. Every path it receives or returns is relative to that folder
 * (what the database stores), so the data survives a change of the folder's location, and a path
 * that tries to escape the folder (`../`) is refused instead of followed.
 */
export class ImageStorage implements IImageStorage {
  constructor(private readonly rootFolder: string) {}

  resolve(imagePath: string): string {
    const root = resolve(this.rootFolder)
    const absolute = resolve(root, imagePath)
    const fromRoot = relative(root, absolute)

    if (!fromRoot || fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
      throw new ConflictError(`"${imagePath}" is not a valid image path`)
    }

    return absolute
  }

  async write(imagePath: string, data: Uint8Array): Promise<void> {
    const target = this.resolve(imagePath)
    const temporary = `${target}.tmp`

    await mkdir(dirname(target), { recursive: true })
    await writeFile(temporary, data)
    await rename(temporary, target)
  }

  async copy(fromPath: string, toPath: string): Promise<void> {
    const target = this.resolve(toPath)

    await mkdir(dirname(target), { recursive: true })
    await copyFile(this.resolve(fromPath), target)
  }

  async remove(imagePath: string): Promise<void> {
    await rm(this.resolve(imagePath), { force: true })
  }

  async list(scope: ImageScope): Promise<string[]> {
    try {
      const names = await readdir(join(this.rootFolder, scope))

      return names.map((name) => `${scope}/${name}`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }
}
