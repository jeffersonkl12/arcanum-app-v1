/**
 * Whether a message comes from the app's own renderer: the dev server in development, a local file
 * in production. Anything else (a page the window navigated to, a frame it embeds) must not reach
 * the engine.
 */
export function isTrustedSender(frameUrl: string | undefined, devServerUrl?: string): boolean {
  if (!frameUrl) return false

  try {
    const url = new URL(frameUrl)

    if (devServerUrl) return url.origin === new URL(devServerUrl).origin
    return url.protocol === 'file:'
  } catch {
    return false
  }
}
