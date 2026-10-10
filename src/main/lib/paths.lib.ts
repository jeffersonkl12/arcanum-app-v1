import { join } from 'node:path'
import { app } from 'electron'

/** Absolute path of a file or folder inside the app's per-user data folder. */
export function resolveDataFile(name: string): string {
  return join(app.getPath('userData'), 'data', name)
}

/** Folder holding the images of the entities (`<scope>/<uuid>.<ext>`); the database stores paths relative to it. */
export function resolveImagesFolder(): string {
  return join(app.getPath('userData'), 'data', 'images')
}

/** Folder with the SQL migrations: shipped as an extra resource when packaged, at the root in dev. */
export function resolveMigrationsFolder(): string {
  return app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle')
}

/**
 * Folder holding every file Mastra persists (storage and observability). Exposed to `src/mastra`
 * through `ARCANUM_MASTRA_DIR` because that code cannot import Electron.
 */
export function resolveMastraDataFolder(): string {
  return join(app.getPath('userData'), 'data', 'mastra')
}

/**
 * Folder with the markdown layers of every agent's system prompt (`<agent>/layers/{static,dynamic}/<layer>.md`):
 * shipped as an extra resource when packaged, in the source tree in dev. Exposed to `src/mastra`
 * through `ARCANUM_AGENTS_DIR`.
 */
export function resolveAgentsFolder(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'agents')
    : join(app.getAppPath(), 'src', 'mastra', 'agents')
}
