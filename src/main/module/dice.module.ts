import { DiceAssetsProtocol, DiceRoller, resolveDiceAssetsFolder } from '@lib'
import { DiceCheckService, type IDiceCheckService } from '@service/dice-check.service'

export const diceCheckService: IDiceCheckService = new DiceCheckService(new DiceRoller())

/** Declares the dice assets scheme; must run before the app is ready. */
export function registerDiceAssetsScheme(): void {
  DiceAssetsProtocol.registerScheme()
}

/** Lets the packaged renderer load the 3D dice assets; call once the app is ready. */
export function serveDiceAssets(): void {
  new DiceAssetsProtocol(resolveDiceAssetsFolder()).serve()
}
