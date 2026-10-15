/**
 * Where Mastra Studio and the dev-only Mastra server meet. The server runs inside the app, only in
 * development, and only on the loopback interface; the Studio UI (`npm run studio`) is a separate
 * process on its own port that talks to it. Keep `package.json`'s `studio` script in step with these.
 */
export const STUDIO = {
  /** Loopback only: Studio has full access to the agents and tools, so nothing else may reach it. */
  host: '127.0.0.1',
  /** Mastra's own default, which `mastra studio` already looks for. */
  serverPort: 4111,
  /** `mastra studio`'s default; it is the origin the server lets read its answers. */
  uiPort: 3000
} as const
