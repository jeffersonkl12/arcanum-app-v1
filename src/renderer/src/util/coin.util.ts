import { z } from 'zod'
import { actorCoinLimits } from '@renderer/constant/actor.constant'

function amountSchema(label: string): z.ZodCoercedNumber {
  const { min, max } = actorCoinLimits
  return z.coerce
    .number(`Informe ${label}`)
    .int(`${label} deve ser um número inteiro`)
    .min(min, `${label} não pode ser negativa`)
    .max(max, `${label} pode ser no máximo ${max}`)
}

/** Form fields for the coins, to spread into a `z.object`. An empty field counts as zero. */
export const coinFormShape = {
  goldPieces: amountSchema('A quantidade de peças de ouro'),
  silverPieces: amountSchema('A quantidade de peças de prata'),
  bronzePieces: amountSchema('A quantidade de peças de bronze')
}
