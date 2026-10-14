/** The coins an actor carries, called "pieces" (peças), from the most to the least valuable. */
export const ACTOR_COINS = ['goldPieces', 'silverPieces', 'bronzePieces'] as const

export type ActorCoin = (typeof ACTOR_COINS)[number]

/** An amount of every coin. */
export type CoinSet = Record<ActorCoin, number>

/** Amount of a coin. `max` is a ceiling so a typo cannot make a character infinitely rich. */
export const ACTOR_COIN_LIMITS = {
  min: 0,
  max: 999_999_999,
  default: 0
} as const
