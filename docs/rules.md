# Project Rules

Extends the standards defined in `CLAUDE.md` / `AGENTS.md`.

## About the project

`arcanum-app` is a local, single-player tabletop RPG desktop app (Electron). It combines three things:

- **Game engine:** the source of truth for the game state and for all calculations (rules, dice, combat, checks, character and world state).
- **Light VTT:** manages the session data a virtual tabletop would (characters, scenes, campaign state).
- **AI game master:** an LLM agent (built with Mastra) that runs the campaign: it narrates, conducts the story and manages the campaign end to end.

The AI never invents or overrides game state. The engine decides what happens and computes the results; the AI reads that state, calls the engine through tools, and uses the results to improve and enrich its narration. Keep this separation in every design decision: rules and calculations belong to the engine, storytelling belongs to the AI.

The engine, the database and Mastra run in the Electron **main** process; the Vue **renderer** is the UI. Scope: one local player. There is no multiplayer, multi-tenant or remote-hosting concern.

## Stack

| Concern      | Tool                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| Language     | TypeScript (`strict`, bundler module resolution, via `@electron-toolkit/tsconfig`) |
| Desktop      | Electron + `electron-vite`                                                         |
| UI           | Vue 3 (`<script setup lang="ts">`, enforced by `vue/block-lang`)                   |
| AI framework | Mastra (`@mastra/core`)                                                            |
| Validation   | Zod                                                                                |
| Database     | Drizzle ORM + drizzle-kit + PGlite (`drizzle-orm/pglite`)                          |
| Lint/format  | ESLint + Prettier (single quotes, no semicolons, width 100, no trailing commas)    |

Always use the `package.json` scripts (`dev`, `build`, `lint`, `format`, `typecheck`, ...) instead of calling the tools directly.

## Processes and boundaries

| Process  | Folder             | Responsibility                                                      |
| -------- | ------------------ | ------------------------------------------------------------------- |
| Main     | `src/main`         | Engine, database, Mastra, IPC handlers, everything with Node access |
| Preload  | `src/preload`      | The only bridge: exposes `window.api` with `contextBridge`          |
| Renderer | `src/renderer/src` | Vue UI (alias `@renderer`)                                          |

- The renderer talks to the main process only through IPC (`ipcMain.handle` / `ipcRenderer.invoke`, exposed by the preload as `window.api` and typed in `src/preload/index.d.ts`). There is no local HTTP server for the app itself; the only port ever opened is the dev-only Mastra server for Studio (see [Mastra](#mastra)).
- The renderer never imports from `src/main` at runtime and has no Node access. The only exception is `import type` (schemas, `@shared`), which is erased at build time.
- Secrets (API keys) stay in main and are never sent to the renderer.
- `.env` is excluded from the packaged app (`electron-builder.yml`), so a production build needs another source for keys.

## Folder layout and aliases

The engine layers live under `src/main/`. Each folder has an alias:

| Alias         | Folder                | Purpose                                                                |
| ------------- | --------------------- | ---------------------------------------------------------------------- |
| `@config`     | `src/main/config`     | Environment and app configuration                                      |
| `@database`   | `src/main/database`   | Drizzle client, migrations wiring                                      |
| `@schema`     | `src/main/schema`     | Zod/Drizzle schemas and derived types                                  |
| `@repository` | `src/main/repository` | Data access                                                            |
| `@service`    | `src/main/service`    | Business logic                                                         |
| `@ipc`        | `src/main/ipc`        | IPC handlers (thin, over service interfaces, input validated with Zod) |
| `@module`     | `src/main/module`     | Feature modules / composition roots                                    |
| `@lib`        | `src/main/lib`        | Wrappers/facades over third-party libs                                 |
| `@util`       | `src/main/util`       | Pure helper functions                                                  |
| `@constant`   | `src/main/constant`   | Constants and enums                                                    |

Folders are created when first needed, not up front. When one is created, declare its alias (both `@name` and `@name/*`) in the same change, in both places:

- `electron.vite.config.ts` (`resolve.alias` of `main`, and of `preload` if it uses it), because that is what the bundle resolves;
- the root `tsconfig.json` `compilerOptions.paths` (inherited by `tsconfig.node.json`), because that is what typecheck, the editor, `tsx` and drizzle-kit resolve. drizzle-kit only reads the root `tsconfig.json`, which is why the paths live there.

`@renderer` is declared in `electron.vite.config.ts` and in the root `tsconfig.json` (`tsconfig.web.json` inherits its `paths` from there, because it type-checks the main-side types the IPC contract imports).

`@shared` (`src/shared`) is the contract between the three processes and the only code all of them may import at runtime: the IPC channels and their types (see [IPC](#ipc)). It may import types from `src/main` but nothing at runtime, because the preload bundles it.

### Pending decisions

- `src/mastra` has no alias yet. `@mastra` cannot be used: it collides with the npm scope `@mastra/*` (`@mastra/core`, ...) and would shadow those packages. Pick a non-conflicting alias (e.g. `@ai`).
- `src/mastra` is also loaded by the Mastra CLI's own bundler (Studio / `mastra` commands), which may not resolve these aliases. Check the Mastra docs before importing through an alias from inside `src/mastra`; until then use relative imports there.

## IPC

`src/shared/ipc-contract.shared.ts` (`ipcContract`) is the single source of truth: its keys (`domain:action`) are the only channels the preload lets through, and its types say what each one takes and returns. Adding a channel is three steps, and the compiler fails until all three are done:

1. Declare it in `ipcContract`.
2. Implement it in `src/main/ipc/<domain>.ipc.ts` with `route(zodSchema, (input) => service.method(...))`. Handlers stay thin, depend on service interfaces, and never parse input themselves. A new domain's routes are wired in `@module/ipc.module.ts`, the composition root.
3. Call it from the renderer: `await window.api.invoke('world:clone', { sourceWorldId })`.

- **Responses:** a call never rejects; it resolves with `IpcResponse<T>` (`{ ok: true, data }` or `{ ok: false, error: { kind, message, issues? } }`). Electron only carries the `message` of a thrown error across IPC and the context bridge drops custom error properties, so a rejected promise would lose the `kind`. `NotFoundError`, `ConflictError` and Zod failures map to `not_found`, `conflict` and `invalid_input`; anything else is logged in main and reaches the renderer as a generic `internal`.
- **Security:** the preload never exposes `ipcRenderer`, only `invoke` over the channels of the contract. Main answers only frames of the app itself (`isTrustedSender`).
- **One argument:** a channel takes a single input; use an object when it needs several values (`{ id, patch }`).
- **Events (main → renderer):** `ipcEventContract` declares the channels main may push (`webContents.send`, behind `IRendererEvents` in `@lib`) and the payload of each; the renderer listens with `window.api.on(channel, listener)`, which returns the unsubscribe function and hands over only the payload. Streaming uses this: a channel such as `gameMaster:streamTurn` returns as soon as the work is accepted and the result arrives as events. The renderer picks the id that correlates them, so it can listen before the first event.
- **Pure files loaded by `src/mastra`:** `src/mastra` imports a few pure files of main by relative path (`main/constant/*`, `main/lib/openui.lib.ts`, `main/util/narration.util.ts`), because the Mastra CLI does not resolve the aliases. Those files must import nothing but other relative files and npm packages, and must not touch Electron or `process.env`.
- **Preload imports:** the preload imports the contract files directly (`@shared/ipc-contract.shared`, ...), not the `@shared` barrel, which also holds code with runtime dependencies (zod) that must not end up `require`d in the preload.

## Barrel files (`index.ts`)

- Every folder has an `index.ts` re-exporting everything at its level and below.
- Use `export * from '@alias/...'` style re-exports resolved through aliases, never hardcoded relative paths.
- Watch for name collisions between `export *` re-exports and for circular imports between barrels. If a cycle appears, fix the dependency direction instead of working around it.
- Exceptions: `src/mastra/index.ts` is the Mastra entry point (registers agents, tools, workflows and scorers), not a barrel. `src/main/index.ts` is the Electron main entry, and `src/preload/index.ts` the preload entry.

## File naming

Pattern: `<name>.<domain>.ts`, e.g. `actor.schema.ts`, `actor.repository.ts`, `actor.service.ts`, `actor.ipc.ts`, `game-master.agent.ts`, `roll-dice.tool.ts`, `campaign.workflow.ts`.

Exempt: config and infra files (`*.config.ts`, `tsconfig*.json`, `electron-builder.yml`, ...) and Vue components (`PascalCase.vue`).

## Interfaces and implementations

- An interface is named with the `I` prefix (`IPartyService`, `IPartyRepository`); its implementing class takes the plain domain name (`PartyService`, `PartyRepository`). Never suffix the class with `Default`, `Impl`, `Drizzle` and the like.
- The interface and its class(es) of the same domain live in the same file (`party.service.ts` holds `IPartyService` and `PartyService`), interface first. Do not split them into `drizzle-party.repository.ts` / `default-party.service.ts`.
- When one interface has several interchangeable implementations (Strategy), each implementation keeps a descriptive name (`MarkdownContextLayer`, `InMemoryStorageProvider`) and may live in its own file; the plain domain name is for the single/default implementation.
- Consumers depend on the interface (`IPartyService`, `IPartyRepository`); the concrete class is only instantiated in the composition roots under `@module`.

## Design guidance

- Single responsibility per file/class; depend on abstractions (types/interfaces) rather than concrete implementations; inject dependencies instead of importing singletons deep inside logic.
- Wrap third-party libs behind a facade in `@lib` so the rest of the code does not depend on their API directly. This includes Electron APIs used in main (`app`, `dialog`, ...) when they leak into business logic.
- Use well-known patterns (Facade, Proxy, Strategy, Factory, Repository) to solve recurring problems; do not hand-roll ad-hoc workarounds.
- Keep functions small and names descriptive. Prefer clarity to micro-optimization.

## Mastra

- Load the `mastra` skill before any Mastra work; never rely on cached knowledge, the APIs change between versions.
- Register all agents, tools, workflows and scorers in `src/mastra/index.ts`.
- The skills live in `.agents/skills` (locked by `skills-lock.json`) and are exposed to Claude Code through symlinks in `.claude/skills`.
- Each agent has its own folder, `src/mastra/agents/<agent>/`, with `<agent>.agent.ts` and a `layers/` folder holding the markdown files of its system prompt, split into `static/` and `dynamic/`.
- A system prompt is built from **layers**, one markdown file each, joined in the order the agent lists them (`layeredInstructions` in `src/mastra/prompt`). Order is priority: what is first and last in the final prompt is weighed most by the model, so list the most important layers at the edges.
  - `layers/static/<name>.md`: content that never changes, emitted verbatim. Keep static layers first; an unchanging prefix lets the provider cache the prompt.
  - `layers/dynamic/<name>.md`: Handlebars template rendered on every run from the request context (game state read from the database by the main process). Dynamic layers follow the static ones, from the state that changes least to the one that changes most. Templates run in strict mode: a missing field throws.
  - The `.md` files are read from disk at runtime, not bundled: main sets `ARCANUM_AGENTS_DIR` (`resolveAgentsFolder` in `@lib`), and packaged builds ship them as an extra resource (`electron-builder.yml`).
- **Studio (development only):** `npm run dev` also starts a Mastra server inside the app (`StudioServer` in `@lib`, started by `@module/studio.module.ts` only when `is.dev`), on `127.0.0.1:4111` (`STUDIO` in `@constant`), with the same `mastra` instance and storage the narrator writes to. `npm run studio` starts the Studio UI on `localhost:4545`, pointed at it, to watch traces, logs and threads of the running app live. Studio has full access to agents and tools, so the server binds to loopback only, never exists in a packaged build, and answers only the Studio origin: Mastra's Hono adapter sets no CORS headers, so `hono/cors` is registered before it, with `credentials: true` because Studio calls the API with `credentials: "include"` and the browser refuses the answer otherwise ("Failed to load studio ... Failed to fetch"). Studio also probes the server by fetching its root and wants a successful answer, and the adapter has no route there, so `StudioServer` serves a `200` at `/`: without it Studio shows its "Mastra instance URL" form instead of connecting. A taken port is logged, never fatal. Do not point `mastra dev` or a second process at the app's data folder.
- Studio shows what the app recorded; it cannot run the narrator. The agent needs the engine's registries and the game state in its request context, which only the main process builds on a turn, so the agent's instructions and model look empty in Studio's agent page and chatting with it there fails. The prompt of a real turn is in the trace of that turn.

## Framework and library documentation

Never rely on memory for APIs. Verify against the official docs (or the Context7 MCP) before writing code that uses them.

- Mastra: https://mastra.ai/llms.txt (and the `mastra` skill)
- Electron: https://www.electronjs.org/docs/latest
- electron-vite: https://electron-vite.org
- Vue: https://vuejs.org
- Drizzle ORM: https://orm.drizzle.team/llms.txt
- Zod: https://zod.dev

Docs for libraries that have no official `llms.txt`, or whose docs are curated for this project, go in `.claude/docs/libs/` (one file per library, listed here). There are none yet.

## Local data

Databases and other local state are never committed (a database or any file that behaves like one, including `-wal`/`-shm`). They live in Electron's per-user data folder (`app.getPath('userData')`), not in the repository. Semantic search, for memories and for anything that comes after them, uses pgvector inside this same database: there is no other vector store. Never point two processes at the same PGlite directory; `src/mastra/index.ts` can be loaded by the Mastra CLI in its own process, so it must not import Electron.

The game database is PGlite at `userData/data/game` (`resolveDataFile` in `@lib`). The schema is versioned with migrations, never `drizzle-kit push`:

1. Entities go in `src/main/database/entity/*.entity.ts` and are re-exported from `entity/index.ts` (the only schema file drizzle-kit reads); relations in `relation.database.ts`.
2. After changing an entity, run `db:generate`; it needs no database. Commit the new folder in `drizzle/` (SQL + snapshot) and never edit one that was already shipped.
3. The app applies pending migrations on startup (`initializeDatabase` in `@module/database.module.ts`, before the window opens) and closes PGlite on quit. Packaged builds ship `drizzle/` as an extra resource (`electron-builder.yml`); `drizzle/.gitkeep` keeps the folder present while there are no migrations.

Mastra's own files (LibSQL `storage.db`, DuckDB `observability.duckdb`) live in `userData/data/mastra` (`resolveMastraDataFolder` in `@lib`). Main passes that folder to `src/mastra` through `ARCANUM_MASTRA_DIR`, set by `loadMastra` in `@module/mastra.module.ts`, which loads `src/mastra` with a dynamic import so the variable is set first. Never import `src/mastra` statically from main. Outside the app (Mastra CLI / Studio) `src/mastra` falls back to `.data/mastra` (git-ignored), so Studio and the app never share a file. The Mastra CLI bundler only extracts config from a literal `export const mastra = new Mastra({...})`, so keep that shape in `src/mastra/index.ts`.

Character memories are rows of the game database, not a separate store: `memory` holds one row per memory (a memory shared by several actors is one row with a list of actor ids) and the embedding of its summary lives in a pgvector column of a table per embedding provider (`memory_embedding_openai`, `memory_embedding_google`; `memoryEmbeddingTables` in `memory.entity.ts`), written together with the memory in one transaction and deleted with it. PGlite loads the pgvector extension (`@electric-sql/pglite-pgvector`) in `createDatabase`, and the first migration (`enable_pgvector`) runs `CREATE EXTENSION`, which Drizzle does not generate. The extension package declares the exact PGlite version it was built for as a peer dependency (today `0.5.10`), and a different one fails to load the extension, so upgrade the two together. The search is an exact scan (`cosineDistance`) with no ANN index on purpose: a campaign holds hundreds of rows. Data access is `IMemoryRepository` (`MemoryRepository`); the AI reaches memories only through `IMemoryRegistry` (`src/mastra/context/memory.context.ts`), so the engine checks that every actor belongs to the world. Embeddings come from `IEmbedder` (`Embedder`), with the provider the player picks in the AI settings (`embeddingProvider`: OpenAI `text-embedding-3-small`, 1536 dimensions, or Google `gemini-embedding-001`, asked for 768; both in `EMBEDDING_MODELS`). Its key (`embeddingApiKey`) belongs to that provider: it is dropped when the embedding provider changes without a new key, and when none is saved it falls back to the narrator's key while both share a provider, then to the provider's environment variable. The vectors of two models are never comparable (and differ in size, which a vector column fixes), so each provider has its own embeddings table: switching provider does not delete anything, the memories embedded by the other provider are still listed (recent, defining, by actor) but are not found by meaning until the player switches back, and there is no re-embedding. To offer another embedding provider, add it to `EMBEDDING_PROVIDERS` and `EMBEDDING_MODELS` (it must be an `AI_PROVIDERS` entry and a model Mastra's router knows), export its table in `memory.entity.ts` and list it in `memoryEmbeddingTables`, then `db:generate`. A memory goes with its world (foreign key with cascade), so deleting a world deletes its memories and embeddings; `GameMasterService.deleteCampaign` also deletes the memories of a campaign whose world stays.

World documents (`document`: a `subject`, a free-text `category` and a plain-text `content` of at most `DOCUMENT_LIMITS.content` characters, written by the player) belong to a world, template or campaign, and a world clone copies them. Their embeddings follow the same scheme as the memories' (a pgvector table per embedding provider, `documentEmbeddingTables`, with the row deleted by cascade with its document), but writing a document never depends on them: `DocumentService` embeds on create and on an edit of the text (`subject · category: content`, `toDocumentEmbeddingText`), and if there is no key or the call fails the document is saved without an embedding. An edit drops the embeddings of every provider before making the new one, so a failure leaves a document unindexed, never stale. `DocumentService.search` first catches up (`indexPending`) the documents the current provider has not embedded, which also covers a player who switched provider, so there is no startup sweep to keep in sync. A world clone copies the embedding rows with the documents, without calling the provider. On every turn `DocumentContextService`, an `IContextSource` listed in `@module/game.module.ts`, embeds the player's message, finds the documents close in meaning to it (at most `DOCUMENT_SEARCH.automaticLimit`, above `automaticMinSimilarity`) and puts them in the prompt's live context (section "World documents"), through the same time-to-live window as the memories: a document stays while the conversation keeps touching its subject. Only the message is embedded on a turn, since the documents were embedded when they were saved; with no key, or if the search fails, the turn goes on without documents. `CachedEmbedder` wraps the embedder so the message, searched by the memories and by the documents on the same turn, is sent to the provider once. The tools `recall-documents` and `list-documents` (over `IDocumentRegistry`, `src/mastra/context/document.context.ts`, both read-only) exist and are registered in `src/mastra/index.ts`, but are not given to the narrator: add them to its `tools` to let it look documents up as well. Documents say what the world is like; events are memories, and the engine's state is never read from a document.

What lingers in the narrator's system prompt besides the fixed layers goes through the context window (`ContextWindowService`): each entry has a time to live in turns (`CONTEXT_TTL`), loses one per turn nothing used it, leaves at zero and gets it all back when used. A kind of dynamic context is an `IContextSource` listed in `@module/game.module.ts`; the prompt renders the result with the `live-context` layer. What counts as "used" is each source's decision (for memories, being found relevant to the player's message).

Images are files, never database content. They live in `userData/data/images/<scope>/<uuid>.<ext>` (`resolveImagesFolder` in `@lib`), and the entity keeps only a path **relative** to that folder in an `image_path` column (`actor/<uuid>.png`), so the data survives a change of location. Rules:

- The column is kept out of the entity's create/update schemas (`.omit({ imagePath: true })`): the renderer never sends a path, it sends the bytes (`actor:setImage` with `{ id, data: Uint8Array }`). Only `ImageService` writes the column, through `ImageRepository`.
- The format is detected from the bytes (PNG, JPEG, WebP, GIF; no SVG) and the size is capped (`IMAGE_LIMITS`); each image gets a new uuid name, so a replaced picture has a new URL and is never served from cache.
- The renderer shows an image with `toImageUrl(imagePath)` from `@shared` (`arcanum-image://local/...`), served by main (`ImageProtocol` in `@lib`) only from inside the images folder. The CSP `img-src` of `index.html` allows the scheme.
- Deleting an entity does not delete its file: `ImageSweepService` removes unused files at startup. A world clone copies its images (`WorldCloneService`).
- To give another entity an image: add its scope to `IMAGE_SCOPES`, an `image_path` column to its table (then `db:generate`), omit it from its schemas, and register an `ImageService` and its sweep owner in `@module/image.module.ts`, plus `<domain>:setImage` / `<domain>:removeImage` channels. If the entity is cloned with its world, copy its images in `WorldCloneRepository` like the actors.

Pending: the reset/seed workflow for development.

## Project notes

<!-- Add implementation notes, domain decisions and library gotchas here as modules are built. -->
