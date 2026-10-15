/** NPCs who are engaged with the player right now and show their whole sheet in the prompt. */
export const NPC_SCENE = {
  /** Most NPCs engaged at once; engaging one more lets the one engaged for longest go. */
  maxActive: 5,
  /** Turns an NPC stays engaged without the player mentioning it; a mention gives them all back. */
  ttlTurns: 6
} as const
