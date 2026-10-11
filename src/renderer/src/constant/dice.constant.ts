import type { InjectionKey } from 'vue'
import type { IpcOutput, RollMode } from '@shared'
import type { IDiceTray } from '@renderer/lib/dice-tray.lib'

/**
 * The 3D dice implementation the app rolls with. Provide another `IDiceTray` (at `App.vue` or in
 * a test) to swap the library; without one, `useDiceRoll` uses the default `diceTray`.
 */
export const diceTrayKey: InjectionKey<IDiceTray> = Symbol('dice-tray')

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
