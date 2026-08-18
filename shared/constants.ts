// validation
export const PASSWORD_MIN_LENGTH = 8
export const SEARCH_MAX_LENGTH = 100

// pagination
export const PAGE_SIZE = 20

// money
export const MONEY_LOCALE = 'en-MY'
export const MONEY_CURRENCY = 'MYR'
export const CENTS_PER_UNIT = 100

// ui
export const SEARCH_DEBOUNCE_MS = 300
export const TABLE_SKELETON_ROWS = 8

// messages
export const MESSAGES = {
  missingDatabaseUrl: 'DATABASE_URL is not set. Copy .env.example to .env.',
  emailRequired: 'Email is required',
  invalidEmail: 'Invalid email address',
  passwordRequired: 'Password is required',
  passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  badCredentials: 'Incorrect email or password',
  unexpected: 'Something went wrong. Please try again.',
} as const
