import type { Server } from 'node:http'
import { serve } from '@hono/node-server'
import { STUDIO } from '@constant'
import type { Mastra } from '@mastra/core/mastra'
import { MastraServer, type HonoBindings, type HonoVariables } from '@mastra/hono'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

/** Where the server listens and which Studio origin may read it; the defaults are `STUDIO`'s. */
export interface StudioServerPorts {
  serverPort?: number
  uiPort?: number
}

export interface IStudioServer {
  /** Starts serving; rejects when the port is taken. Does nothing if it is already serving. */
  start(): Promise<void>
  /** Stops serving and drops the connections still open (Studio keeps streams open). */
  stop(): Promise<void>
}

/**
 * The HTTP face of the app's own Mastra instance, so Mastra Studio can show its traces, logs and
 * threads live: the same instance and the same storage the narrator writes to, with no second
 * process opening the data files. It is for development only (the module that builds it decides).
 *
 * Mastra's Hono adapter sets no CORS headers, and Studio runs on another origin, so the browser
 * would refuse every answer: `hono/cors` goes in before the adapter, limited to the Studio origin.
 * Studio also decides whether a server is there by fetching its root and wanting a successful answer
 * (the adapter has no route there, so it would be a 404 and Studio would ask for the URL by hand).
 */
export class StudioServer implements IStudioServer {
  private server?: Server

  private readonly serverPort: number
  private readonly uiPort: number

  constructor(
    private readonly loadMastra: () => Promise<Mastra>,
    { serverPort = STUDIO.serverPort, uiPort = STUDIO.uiPort }: StudioServerPorts = {}
  ) {
    this.serverPort = serverPort
    this.uiPort = uiPort
  }

  async start(): Promise<void> {
    if (this.server) return

    const app = new Hono<{ Bindings: HonoBindings; Variables: HonoVariables }>()
    app.use(
      '*',
      cors({
        origin: [`http://localhost:${this.uiPort}`, `http://${STUDIO.host}:${this.uiPort}`],
        // Studio calls the API with `credentials: "include"`, which the browser only accepts when the
        // answer allows credentials (and names the origin, which the list above does).
        credentials: true
      })
    )
    app.get('/', (context) =>
      context.text(`Mastra API of this app. Open Studio at http://localhost:${this.uiPort}.`)
    )
    await new MastraServer({ app, mastra: await this.loadMastra() }).init()

    await new Promise<void>((resolve, reject) => {
      const server = serve(
        { fetch: app.fetch, port: this.serverPort, hostname: STUDIO.host },
        () => {
          this.server = server as Server
          resolve()
        }
      )
      server.once('error', reject)
    })
  }

  async stop(): Promise<void> {
    const server = this.server
    if (!server) return
    this.server = undefined

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
      server.closeAllConnections()
    })
  }
}
