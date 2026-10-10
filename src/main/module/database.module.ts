import { createDatabase, migrateDatabase } from '@database'
import { resolveDataFile, resolveMigrationsFolder } from '@lib'

export const database = createDatabase(resolveDataFile('game'))

/** Brings the schema up to date; must finish before anything reads the database. */
export function initializeDatabase(): Promise<void> {
  return migrateDatabase(database, resolveMigrationsFolder())
}

/** Flushes and closes PGlite; call when the app quits. */
export function closeDatabase(): Promise<void> {
  return database.$client.close()
}
