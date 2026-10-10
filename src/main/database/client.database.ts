import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { relations } from '@database/relation.database'
import type { PGlite } from '@electric-sql/pglite'
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite'

/** Opens (or creates) the PGlite database stored in `dataDirectory`. */
export function createDatabase(dataDirectory: string): Database {
  // PGlite creates its own folder but not the ones above it.
  mkdirSync(dirname(resolve(dataDirectory)), { recursive: true })

  return drizzle({ connection: { dataDir: dataDirectory }, relations })
}

/** The Drizzle client type; repositories receive it by injection. */
export type Database = PgliteDatabase<typeof relations> & { $client: PGlite }

/** What a repository runs its queries on: the client itself or a transaction opened on it. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export type DatabaseExecutor = Database | Transaction
