import type { IpcOutput, RollMode } from '@shared'

export const checkOutcomeLabel: Readonly<
  Record<IpcOutput<'dice:resolveCheck'>['outcome'], string>
> = {
  critical_failure: 'Falha crítica',
  failure: 'Falha',
  success: 'Sucesso',
  critical_success: 'Sucesso crítico'
}

/** Only the modes that change the roll get a tag on the button. */
export const rollModeTag: Readonly<Partial<Record<RollMode, string>>> = {
  advantage: 'Vantagem',
  disadvantage: 'Desvantagem'
}
