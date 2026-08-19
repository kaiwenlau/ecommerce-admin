import { MESSAGES } from '#shared/constants'

type FetchErrorish = {
  data?: { statusMessage?: string, message?: string }
  statusMessage?: string
}

/**
 * Pulls a human-readable line out of a failed `$fetch`. For errors that are NOT field errors.
 *
 * @param error Anything caught from `$fetch`
 * @param fallback Shown when the error carries no usable text
 * @returns A line safe to render. Never an empty string
 */
export const errorMessage = (error: unknown, fallback: string = MESSAGES.unexpected): string => {
  const source = error as FetchErrorish
  return source?.data?.statusMessage
    || source?.data?.message
    || source?.statusMessage
    || fallback
}
