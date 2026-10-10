import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Engine layers under src/main. Keep in sync with `paths` in tsconfig.json.
const mainLayers = [
  'config',
  'database',
  'schema',
  'repository',
  'service',
  'ipc',
  'module',
  'lib',
  'util',
  'constant',
  'error'
]

// Contract between the processes (IPC channels and their types); the only code all three share.
const sharedAlias = { '@shared': resolve('src/shared') }

// ESM-only dependencies (their `exports` have only an `import` condition). Main is built as CJS, so
// leaving them external makes `require()` fail with ERR_PACKAGE_PATH_NOT_EXPORTED; bundle them.
const esmOnlyDeps = ['@randsum/roller']

export default defineConfig({
  main: {
    build: { externalizeDeps: { exclude: esmOnlyDeps } },
    resolve: {
      alias: {
        ...Object.fromEntries(
          mainLayers.map((layer) => [`@${layer}`, resolve(`src/main/${layer}`)])
        ),
        ...sharedAlias
      }
    }
  },
  preload: {
    resolve: { alias: sharedAlias }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        ...sharedAlias
      }
    },
    plugins: [vue(), tailwindcss()]
  }
})
