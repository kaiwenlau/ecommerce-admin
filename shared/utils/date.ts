/**
 * Lives in `./shared` dir so both the browser and the server routes can use it.
 * If this file changes, both sides change together.
 */

import { DISPLAY_TIME_ZONE, MONEY_LOCALE } from '#shared/constants'

/**
 * WHY `timeZone` IS PASSED EXPLICITLY
 *
 * These pages are server-rendered first and then hydrated in the browser. Without `timeZone`,
 * `Intl` uses whatever zone the process is in — Node's on the server, the user's on the client.
 * A date rendered on the server as "17 Aug" can hydrate as "16 Aug", and Vue reports a hydration
 * mismatch on every date on the page. Naming the zone makes both halves agree.
 */
const dateOnly = new Intl.DateTimeFormat(MONEY_LOCALE, {
  dateStyle: 'medium',
  timeZone: DISPLAY_TIME_ZONE,
})

const dateAndTime = new Intl.DateTimeFormat(MONEY_LOCALE, {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: DISPLAY_TIME_ZONE,
})

/**
 * WHY THESE TAKE A `string` AND NOT A `Date`
 *
 * Every route serializes its dates on the way out (server/utils/toIso.ts), so page only holds ISO strings.
 * A route that forgot to convert would show up as a type mismatch thru typecheck.
 * The compiler finds the missed conversion for you.
 */

/**
 * Formats a date for display, without the time.
 * @param value An ISO date string, as a JSON response carries it
 * @returns e.g. `17 Aug 2026`
 */
export const formatDate = (value: string): string => dateOnly.format(new Date(value))

/**
 * Formats a date with the time. Used where the ordering within a day matters — the audit trail.
 * @param value An ISO date string, as a JSON response carries it
 * @returns e.g. `17 Aug 2026, 14:05`
 */
export const formatDateTime = (value: string): string => dateAndTime.format(new Date(value))
