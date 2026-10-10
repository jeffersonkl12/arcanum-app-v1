import { roll } from '@randsum/roller'

/** Source of random d6 results; the engine rolls dice only through this facade. */
export interface IDiceRoller {
  /** Rolls `quantity` six-sided dice and returns each die's face, in rolled order. */
  rollD6(quantity: number): number[]
}

/** Facade over `@randsum/roller`. `randomFn` (returns a number in [0, 1)) makes rolls deterministic. */
export class DiceRoller implements IDiceRoller {
  constructor(private readonly randomFn?: () => number) {}

  rollD6(quantity: number): number[] {
    const result = roll({ sides: 6, quantity }, { randomFn: this.randomFn })

    return result.rolls.flatMap((record) => record.rolls)
  }
}
