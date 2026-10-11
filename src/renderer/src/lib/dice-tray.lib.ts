import DiceBox from '@3d-dice/dice-box'
import { DICE_ASSETS_ORIGIN } from '@shared'

/**
 * Where `public/assets/dice-box` (the package's `dist/assets`) is served from. The dev server and
 * the packaged app differ: the page is `file://` when packaged, where `fetch` of local files does
 * not work, so main serves the same folder under its own scheme (`DiceAssetsProtocol`).
 */
const IS_PACKAGED_PAGE = window.location.protocol === 'file:'
const ASSET_ORIGIN = IS_PACKAGED_PAGE ? DICE_ASSETS_ORIGIN : window.location.origin
const ASSET_PATH = IS_PACKAGED_PAGE ? '/' : '/assets/dice-box/'
/** How long the dice stay on screen after they stop, so the player can read them. */
const LINGER_MS = 1600
const D6_SIDES = 6

export interface IDiceTray {
  /** Throws `quantity` six-sided dice on screen and resolves with each face once they stop. */
  rollD6(quantity: number): Promise<number[]>
}

/**
 * Facade over `@3d-dice/dice-box`: a transparent canvas over the whole window where the dice
 * tumble. The dice only *look* random here; what a roll means is decided by the engine, which
 * receives the faces (`dice:resolveCheck`). The box is created on the first roll, because it loads
 * a WASM physics engine and nothing needs it before.
 */
export class DiceTray implements IDiceTray {
  private box: Promise<DiceBox> | undefined
  private clearTimer: ReturnType<typeof setTimeout> | undefined

  async rollD6(quantity: number): Promise<number[]> {
    const box = await this.ensureBox()
    clearTimeout(this.clearTimer)

    const dice = await box.roll(`${quantity}d6`)
    this.clearTimer = setTimeout(() => box.clear(), LINGER_MS)

    const faces = dice.filter((die) => die.sides === D6_SIDES).map((die) => die.value)
    if (faces.length !== quantity) throw new Error(`Rolled ${faces.length} of ${quantity} dice`)

    return faces
  }

  private ensureBox(): Promise<DiceBox> {
    // A failed start is not kept, so the next roll tries again.
    this.box ??= this.createBox().catch((error: unknown) => {
      this.box = undefined
      throw error
    })

    return this.box
  }

  private async createBox(): Promise<DiceBox> {
    const container = document.createElement('div')
    container.id = 'dice-tray'
    // Never in the way of the chat: the dice are only a picture.
    container.className =
      'pointer-events-none fixed inset-0 z-50 [&>canvas]:absolute [&>canvas]:inset-0 [&>canvas]:size-full'
    document.body.appendChild(container)

    try {
      const box = new DiceBox({
        container: `#${container.id}`,
        assetPath: ASSET_PATH,
        origin: ASSET_ORIGIN
      })
      await box.init()

      return box
    } catch (error) {
      container.remove()
      throw error
    }
  }
}

export const diceTray: IDiceTray = new DiceTray()
