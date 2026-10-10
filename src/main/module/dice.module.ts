import { DiceRoller } from '@lib/dice.lib'
import { DiceCheckService, type IDiceCheckService } from '@service/dice-check.service'

export const diceCheckService: IDiceCheckService = new DiceCheckService(new DiceRoller())
