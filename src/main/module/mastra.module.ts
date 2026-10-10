import type { Mastra } from '@mastra/core/mastra'
import { resolveMastraDataFolder } from '@lib'

let instance: Promise<Mastra> | undefined

/**
 * Loads `src/mastra` on first use. That entry cannot import Electron (the Mastra CLI loads it in
 * its own process), so it reads its data folder from `ARCANUM_MASTRA_DIR`; the dynamic import
 * guarantees the variable is set before the module runs. Never import `src/mastra` statically.
 */
export function loadMastra(): Promise<Mastra> {
  instance ??= (async () => {
    process.env.ARCANUM_MASTRA_DIR = resolveMastraDataFolder()
    const { mastra } = await import('../../mastra')
    return mastra
  })()
  return instance
}
