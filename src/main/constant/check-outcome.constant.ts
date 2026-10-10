export const CHECK_OUTCOMES = [
  'critical_failure',
  'failure',
  'success',
  'critical_success'
] as const

export type CheckOutcome = (typeof CHECK_OUTCOMES)[number]
