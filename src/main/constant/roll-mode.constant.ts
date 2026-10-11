// The renderer needs the modes too (to draw `2d6` on the roll button), so the definition lives in
// `@shared`. Relative on purpose: `src/mastra` loads this file and the Mastra CLI does not resolve
// the aliases.
export * from '../../shared/roll-mode.shared'
