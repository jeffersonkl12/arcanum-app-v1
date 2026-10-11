import { createLibrary, defineComponent, type ComponentRenderer } from '@openuidev/vue-lang'
import { NARRATOR_UI_COMPONENTS, NARRATOR_UI_ROOT } from '@shared'
import NarratorChoices from '@renderer/components/custom/NarratorChoices.vue'
import NarratorRollRequest from '@renderer/components/custom/NarratorRollRequest.vue'
import NarratorStack from '@renderer/components/custom/NarratorStack.vue'

/** The Vue component that draws each name of the shared vocabulary. */
const renderers: Record<string, ComponentRenderer> = {
  Stack: NarratorStack,
  Choices: NarratorChoices,
  RollRequest: NarratorRollRequest
}

/**
 * The renderer's side of the narrator's UI: the same components the narrator is taught
 * (`NARRATOR_UI_COMPONENTS`), each with the Vue component that draws it. A name of the vocabulary
 * with no component here would show up as `unknown-component`, so it fails at load instead.
 */
export const narratorLibrary = createLibrary({
  components: NARRATOR_UI_COMPONENTS.map((spec) => {
    const component = renderers[spec.name]
    if (!component) {
      throw new Error(
        `The narrator UI component "${spec.name}" has no Vue component in the renderer`
      )
    }
    return defineComponent({ ...spec, component })
  }),
  root: NARRATOR_UI_ROOT
})
