/// <reference types="vite/client" />

// `@3d-dice/dice-box` ships no types; only what `DiceTray` (`lib/dice-tray.lib.ts`) uses.
declare module '@3d-dice/dice-box' {
  interface DiceBoxConfig {
    container: string
    assetPath: string
    origin?: string
    scale?: number
    theme?: string
  }

  /** One die that came to rest. */
  interface RolledDie {
    sides: number
    value: number
  }

  export default class DiceBox {
    constructor(config: DiceBoxConfig)
    init(): Promise<void>
    /** Clears the table, throws the dice and resolves when all of them stopped. */
    roll(notation: string): Promise<RolledDie[]>
    clear(): this
  }
}
