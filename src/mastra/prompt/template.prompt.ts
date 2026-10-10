import Handlebars from 'handlebars'

// Own environment, so helpers or partials registered elsewhere never leak into the prompts.
const environment = Handlebars.create()

/**
 * Compiles a Handlebars template of a prompt layer. Facade over the library: nothing else in the
 * prompt system knows about Handlebars.
 *
 * - `noEscape`: the output is markdown for an LLM, not HTML; escaping would turn quotes into
 *   entities.
 * - `strict`: a field the template uses but the data lacks throws, instead of silently rendering
 *   nothing and sending the model a prompt with a hole in it.
 */
export function compileTemplate(source: string): (data: unknown) => string {
  return environment.compile(source, { noEscape: true, strict: true })
}
