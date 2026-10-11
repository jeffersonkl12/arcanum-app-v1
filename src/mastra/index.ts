import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Mastra } from '@mastra/core/mastra'
import { PinoLogger } from '@mastra/loggers'
import { LibSQLStore } from '@mastra/libsql'
import { DuckDBStore } from '@mastra/duckdb'
import { MastraCompositeStore } from '@mastra/core/storage'
import {
  Observability,
  MastraStorageExporter,
  MastraPlatformExporter,
  SensitiveDataFilter
} from '@mastra/observability'
import { narratorAgent } from './agents/narrator/narrator.agent'
import { npcCreatorAgent } from './agents/npc-creator/npc-creator.agent'
import { createNpcTool } from './tools/create-npc.tool'
import { createItemsTool } from './tools/create-items.tool'
import { deleteItemsTool } from './tools/delete-items.tool'
import { equipItemsTool } from './tools/equip-items.tool'
import { getInventoryTool } from './tools/get-inventory.tool'
import { rollCheckTool } from './tools/roll-check.tool'
import { transferItemsTool } from './tools/transfer-items.tool'
import { updateItemsTool } from './tools/update-items.tool'

// Electron main sets ARCANUM_MASTRA_DIR (userData/data/mastra) before this module loads. This file
// cannot import Electron (the Mastra CLI loads it in its own process), so outside the app it falls
// back to a git-ignored folder, separate from the app's so Studio and the app never share a file.
const dataDir = resolve(process.env.ARCANUM_MASTRA_DIR ?? join(process.cwd(), '.data', 'mastra'))
mkdirSync(dataDir, { recursive: true })

export const mastra = new Mastra({
  agents: { narrator: narratorAgent, npcCreator: npcCreatorAgent },
  tools: {
    createNpcTool,
    rollCheckTool,
    createItemsTool,
    updateItemsTool,
    deleteItemsTool,
    transferItemsTool,
    equipItemsTool,
    getInventoryTool
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      // Uses a hosted database when deployed (mastra env db create --kind turso),
      // and a local file during development.
      url: process.env.TURSO_DATABASE_URL ?? `file:${join(dataDir, 'storage.db')}`,
      authToken: process.env.TURSO_AUTH_TOKEN
    }),
    domains: {
      observability: new DuckDBStore({
        path: join(dataDir, 'observability.duckdb')
      }).observability
    }
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info'
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(), // Persists observability events to Mastra Storage
          new MastraPlatformExporter() // Sends observability events to Mastra Platform (if MASTRA_PLATFORM_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter() // Redacts sensitive data like passwords, tokens, keys
        ]
      }
    }
  })
})
