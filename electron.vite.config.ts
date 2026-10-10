import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

// Engine layers under src/main. Keep in sync with `paths` in tsconfig.node.json.
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

export default defineConfig({
  main: {
    resolve: {
      alias: Object.fromEntries(
        mainLayers.map((layer) => [`@${layer}`, resolve(`src/main/${layer}`)])
      )
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
