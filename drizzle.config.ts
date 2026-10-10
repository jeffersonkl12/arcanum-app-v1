import { defineConfig } from 'drizzle-kit'

// Only used by `db:generate`, which needs no database: the app applies the migrations on startup.
export default defineConfig({
  out: './drizzle',
  schema: './src/main/database/entity/index.ts',
  dialect: 'postgresql',
  driver: 'pglite'
})
