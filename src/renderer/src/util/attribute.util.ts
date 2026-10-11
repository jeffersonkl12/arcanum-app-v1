import { z } from 'zod'
import { actorAttributeLimits } from '@renderer/constant/actor.constant'

function scoreSchema(label: string): z.ZodOptional<z.ZodNumber> {
  const { min, max } = actorAttributeLimits
  return z
    .number(`Informe ${label}`)
    .int(`${label} deve ser um número inteiro`)
    .min(min, `${label} deve ser de pelo menos ${min}`)
    .max(max, `${label} pode ser no máximo ${max}`)
    .optional()
}

/**
 * Form fields for the attributes, to spread into a `z.object`. Optional: an empty score means
 * "the engine's default".
 */
export const attributeFormShape = {
  strength: scoreSchema('A força'),
  dexterity: scoreSchema('A destreza'),
  intelligence: scoreSchema('A inteligência')
}
