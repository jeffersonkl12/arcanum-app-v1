import type { NarrationDeltaEvent, NarrationSegment } from '@shared'

/**
 * Adds the new text of a `delta` to the segment at its position, creating the segment the first
 * time it is seen. The positions only grow in the order the reply is written, so the segments
 * stay in order. A UI block is complete only when the turn is `done`, hence no issues yet.
 */
export function appendNarrationDelta(
  segments: NarrationSegment[],
  delta: Pick<NarrationDeltaEvent, 'segment' | 'kind' | 'text'>
): void {
  const current = segments[delta.segment]
  if (!current) {
    segments[delta.segment] =
      delta.kind === 'prose'
        ? { type: 'prose', text: delta.text }
        : { type: 'ui', source: delta.text, issues: [] }
    return
  }

  if (current.type === 'prose') current.text += delta.text
  else current.source += delta.text
}
