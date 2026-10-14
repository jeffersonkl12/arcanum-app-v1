export const CHECK_OUTCOMES = ['failure', 'success'] as const

export type CheckOutcome = (typeof CHECK_OUTCOMES)[number]
