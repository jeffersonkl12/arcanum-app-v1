import { createLibrary, createParser, defineComponent, type Library } from '@openuidev/vue-lang'
// Relative on purpose: the narrator's prompt (`src/mastra`) imports this file too, and the Mastra
// CLI that also loads that folder does not resolve the aliases.
import {
  NARRATOR_UI_COMPONENTS,
  NARRATOR_UI_ROOT,
  type NarrationIssue
} from '../../shared/narrator-ui.shared'

let library: Library | undefined

/**
 * The narrator's OpenUI library, built from the shared vocabulary. It exists to teach the model
 * (`library.prompt`) and to check what it wrote, so its components render nothing: the Vue
 * components that draw them belong to the renderer, which builds its own library from the same
 * `NARRATOR_UI_COMPONENTS`.
 */
export function narratorUiLibrary(): Library {
  library ??= createLibrary({
    components: NARRATOR_UI_COMPONENTS.map((spec) =>
      defineComponent({ ...spec, component: () => null })
    ),
    root: NARRATOR_UI_ROOT
  })

  return library
}

/**
 * Checks one UI block (OpenUI Lang source, no fence) against the vocabulary. The parser never
 * throws and renders what it can, so these are findings, not a verdict: an empty list means the
 * block is whole and uses only known components with the right props.
 */
export function validateNarratorUi(source: string): NarrationIssue[] {
  const { root, meta } = createParser(narratorUiLibrary().toJSONSchema(), NARRATOR_UI_ROOT).parse(
    source
  )

  const issues: NarrationIssue[] = meta.errors.map(({ code, message, component }) => ({
    code,
    message,
    component
  }))

  for (const name of meta.unresolved) {
    issues.push({ code: 'unresolved-reference', message: `"${name}" is used but never defined` })
  }
  if (meta.incomplete) {
    issues.push({ code: 'incomplete', message: 'The block ends before it is complete' })
  }
  if (!root && issues.length === 0) {
    issues.push({ code: 'no-root', message: `The block defines no ${NARRATOR_UI_ROOT} root` })
  }

  return issues
}
