import type { IpcChannel, IpcInput, IpcOutput } from '@shared'
import type { z } from 'zod'

/** A channel's handler: the schema validates what the renderer sent before `run` sees it. */
export interface Route<TInput, TOutput> {
  readonly schema: z.ZodType<TInput>
  readonly run: (input: TInput) => Promise<TOutput>
}

/** Declares a route; `run` gets the validated input, so a handler never parses anything itself. */
export function route<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  run: (input: TInput) => Promise<TOutput> | TOutput
): Route<TInput, TOutput> {
  return { schema, run: async (input) => run(input) }
}

/** Routes of every channel; the compiler rejects a missing channel or a mismatched type. */
export type IpcRoutes = {
  [TChannel in IpcChannel]: Route<IpcInput<TChannel>, IpcOutput<TChannel>>
}

/** The routes of one domain, e.g. `RoutesOf<'world'>` is every `world:*` channel. */
export type RoutesOf<TDomain extends string> = Pick<
  IpcRoutes,
  Extract<IpcChannel, `${TDomain}:${string}`>
>
