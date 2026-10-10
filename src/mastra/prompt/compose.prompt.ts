import type { PromptLayer } from './layer.prompt'

const LAYER_SEPARATOR = '\n\n'

/** Joins the layers, in the order given, into the single system prompt. Empty layers are skipped. */
export function composePrompt<TContext>(
  layers: readonly PromptLayer<TContext>[],
  context: TContext
): string {
  return layers
    .map((layer) => layer.render(context))
    .filter((content) => content.length > 0)
    .join(LAYER_SEPARATOR)
}

/**
 * Builds the `instructions` of an agent from its layers. Mastra calls it on every run with that
 * run's request context, which is what keeps the dynamic layers current.
 */
export function layeredInstructions<TContext>(layers: readonly PromptLayer<TContext>[]) {
  return ({ requestContext }: { requestContext: { all: TContext } }): string =>
    composePrompt(layers, requestContext.all)
}
