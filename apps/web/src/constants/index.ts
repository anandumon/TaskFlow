export const TASK_WEIGHTS = {
  todo: 0,
  in_progress: 35,
  in_review: 75,
  done: 100,
} as const

export const ALL_ENVIRONMENTS = ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN'] as const

export const DEFAULT_PROJECT_ENVIRONMENTS = ['DEV', 'SIT', 'UAT', 'RELEASE', 'MAIN']

export const PASSWORD_MIN_LENGTH = 8
export const OTP_CODE_LENGTH = 6
