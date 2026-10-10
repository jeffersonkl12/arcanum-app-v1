/** Optional text the user left empty means "no value" to the engine, not an empty string. */
export function emptyToNull(value: string | null | undefined): string | null {
  return value?.trim() ? value : null
}
