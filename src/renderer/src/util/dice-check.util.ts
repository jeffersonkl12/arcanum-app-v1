import { rollNotation, type IpcOutput } from '@shared'
import { actorAttributeOptions } from '@renderer/constant/actor.constant'
import { checkOutcomeLabel } from '@renderer/constant/dice.constant'

/**
 * What the player "says" after rolling: it is the next message of the turn, so it is what the
 * narrator reads. The outcome is the engine's; this only words it.
 */
export function formatCheckMessage(label: string, result: IpcOutput<'dice:resolveCheck'>): string {
  const subject = label.trim() ? `${label.trim()} ` : ''
  const attribute =
    actorAttributeOptions.find((option) => option.key === result.attribute)?.label ??
    result.attribute

  return `🎲 ${subject}(${attribute}, ${rollNotation(result.dice.length)}): ${result.dice.join(', ')} — ${checkOutcomeLabel[result.outcome]}`
}
