import { join } from 'node:path'
import { app } from 'electron'

/** Absolute path of a file or folder inside the app's per-user data folder. */
export function resolveDataFile(name: string): string {
  return join(app.getPath('userData'), 'data', name)
}

/** Folder with the SQL migrations: shipped as an extra resource when packaged, at the root in dev. */
export function resolveMigrationsFolder(): string {
  return app.isPackaged ? join(process.resourcesPath, 'drizzle') : join(app.getAppPath(), 'drizzle')
}
