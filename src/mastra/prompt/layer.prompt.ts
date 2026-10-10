import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { compileTemplate } from './template.prompt'

/**
 * A piece of an agent's system prompt, backed by one markdown file. Layers are rendered in the
 * order they are listed and joined into a single prompt, so the order is the priority: the first
 * and last layers are the ones the model weighs most, the middle is where details get lost.
 */
export interface PromptLayer<TContext> {
  readonly name: string
  render(context: TContext): string
}

/**
 * Folder with one subfolder per agent (`<agent>/layers/{static,dynamic}/<layer>.md`). The Electron main process sets
 * `ARCANUM_AGENTS_DIR` before `src/mastra` loads, because the markdown files are not part of the
 * bundle (in a packaged app they ship as an extra resource). Outside the app (Mastra CLI / Studio)
 * the source tree is used.
 */
function resolveAgentsDir(): string {
  return resolve(process.env.ARCANUM_AGENTS_DIR ?? join(process.cwd(), 'src', 'mastra', 'agents'))
}

function readLayerFile(agent: string, name: string, kind: 'static' | 'dynamic'): string {
  return readFileSync(join(resolveAgentsDir(), agent, 'layers', kind, `${name}.md`), 'utf8').trim()
}

/**
 * Layer whose content never changes: `<agent>/layers/static/<name>.md`, read once. It is emitted
 * verbatim, so `{{` in it is plain text. Keep static layers first in the prompt: an unchanging
 * prefix is what lets the provider cache the prompt between turns.
 */
export function staticLayer(agent: string, name: string): PromptLayer<unknown> {
  const content = readLayerFile(agent, name, 'static')

  return { name, render: () => content }
}

/**
 * Layer whose content never changes but comes from code, not from a markdown file (the OpenUI Lang
 * prompt is generated from the component library). Built once and emitted verbatim; like a static
 * layer, it belongs in the cacheable prefix, before the dynamic ones.
 */
export function generatedLayer(name: string, build: () => string): PromptLayer<unknown> {
  const content = build().trim()

  return { name, render: () => content }
}

/**
 * Layer rendered on every turn from the game state: `<agent>/layers/dynamic/<name>.md`, a Handlebars
 * template compiled once. `select` turns the request context into the data the template uses, so
 * the template depends on that shape and not on the whole context.
 */
export function dynamicLayer<TContext, TData>(
  agent: string,
  name: string,
  select: (context: TContext) => TData
): PromptLayer<TContext> {
  const render = compileTemplate(readLayerFile(agent, name, 'dynamic'))

  return { name, render: (context) => render(select(context)).trim() }
}
