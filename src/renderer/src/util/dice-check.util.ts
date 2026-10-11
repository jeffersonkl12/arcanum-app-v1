import { rollNotation, type IpcOutput, type RollMode } from '@shared'
import { checkOutcomeLabel } from '@renderer/constant/dice.constant'

/**
 * What the player "says" after rolling: it is the next message of the turn, so it is what the
 * narrator reads. The outcome is the engine's; this only words it.
 */
export function formatCheckMessage(
  label: string,
  mode: RollMode,
  result: IpcOutput<'dice:resolveCheck'>
): string {
  const subject = label.trim() ? `${label.trim()} ` : ''

  return `🎲 ${subject}(${rollNotation(mode)}): ${result.dice.join(', ')} — ${checkOutcomeLabel[result.outcome]}`
}
