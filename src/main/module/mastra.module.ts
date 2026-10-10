import type { Mastra } from '@mastra/core/mastra'
import { resolveAgentsFolder, resolveMastraDataFolder } from '@lib'

let instance: Promise<Mastra> | undefined

/**
 * Loads `src/mastra` on first use. That entry cannot import Electron (the Mastra CLI loads it in
 * its own process), so it reads its data folder from `ARCANUM_MASTRA_DIR` and the markdown layers
 * of its prompts from `ARCANUM_AGENTS_DIR`; the dynamic import guarantees both variables are set
 * before the module runs. Never import `src/mastra` statically.
 */
export function loadMastra(): Promise<Mastra> {
  instance ??= (async () => {
    process.env.ARCANUM_MASTRA_DIR = resolveMastraDataFolder()
    process.env.ARCANUM_AGENTS_DIR = resolveAgentsFolder()
    const { mastra } = await import('../../mastra')
    return mastra
  })()
  return instance
}
