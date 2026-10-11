/**
 * Scheme main serves the 3D dice assets under in the packaged app, where the page is loaded from
 * `file://` and the dice library cannot `fetch` them. The renderer's CSP must allow it.
 */
export const DICE_ASSETS_PROTOCOL = 'arcanum-dice'

/** Origin the dice assets are served from (`arcanum-dice://local/themes/...`). */
export const DICE_ASSETS_ORIGIN = `${DICE_ASSETS_PROTOCOL}://local`
