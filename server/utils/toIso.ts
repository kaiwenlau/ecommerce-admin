/**
 * Turns a Prisma `Date` into the string the browser will actually receive.
 *
 * WHY THIS EXISTS
 *
 * Prisma hands a route real `Date` objects, so by the time a page reads them they are ISO strings.
 * Calling this changes nothing on the wire, what it changes is the route's TYPE.
 * Handler returns `string` describes what really arrives.
 *
 * WHY ISO AND NOT `getTime()`
 *
 * The string is self-describing, and it is already what the default encoding produces, so it costs nothing to keep.
 * `1753643731099` tells you nothing in DevTools, in a log line or in a `curl` response.
 * Both are UTC. A `Date` is an instant and carries no timezone at all, so nothing is "lost in transit".
 * Timezone only enters when the string is FORMATTED.
 *
 * Nitro auto-imports everything in `server/utils`, so routes call this with no import line.
 */

/**
 * @param value The date to serialize
 * @returns The same instant as an ISO 8601 string in UTC, e.g. `2026-07-27T19:15:31.099Z`
 */
export function toIso(value: Date): string
/**
 * The nullable overload — `deletedAt`, and a customer with no orders yet.
 * @param value The date to serialize, or null
 * @returns The ISO string, or null when there was no date
 */
export function toIso(value: Date | null): string | null
// Overload signatures are one of the few places CLAUDE.md's arrow-by-default rule does not apply:
// an arrow function cannot carry them.
export function toIso(value: Date | null) {
  return value ? value.toISOString() : null
}
