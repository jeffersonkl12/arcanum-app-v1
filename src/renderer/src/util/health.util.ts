import { z } from 'zod'
import { actorHpLimits } from '@renderer/constant/actor.constant'

/**
 * Form fields for health, to spread into a `z.object`. Both are optional: an empty maximum means
 * "the engine's default", and the current health is only asked when an actor is edited.
 */
export const healthFormShape = {
  hpMax: z
    .number('Informe a vida máxima')
    .int('A vida máxima deve ser um número inteiro')
    .min(actorHpLimits.minMax, `A vida máxima deve ser de pelo menos ${actorHpLimits.minMax}`)
    .max(actorHpLimits.max, `A vida máxima pode ser no máximo ${actorHpLimits.max}`)
    .optional(),
  hpCurrent: z
    .number('Informe a vida atual')
    .int('A vida atual deve ser um número inteiro')
    .min(0, 'A vida atual não pode ser negativa')
    .max(actorHpLimits.max, `A vida atual pode ser no máximo ${actorHpLimits.max}`)
    .optional()
}

/** The same rule as the engine: current health never goes above the maximum. */
export function isHealthConsistent(values: { hpMax?: number; hpCurrent?: number }): boolean {
  return values.hpMax === undefined || values.hpCurrent === undefined
    ? true
    : values.hpCurrent <= values.hpMax
}

export const healthConsistencyIssue = {
  path: ['hpCurrent'],
  message: 'A vida atual não pode ser maior que a vida máxima'
}
