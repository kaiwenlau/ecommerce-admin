/**
 * The 'Unauthorised' UI state, in one place.
 *
 * A 401 can arrive long after the route middleware waved the user through: the cookie expires
 * while the page sits open, or another tab signs out. `app/middleware/auth.global.ts` only runs
 * on navigation, so it never sees that.
 *
 * `clear()` is `nuxt-auth-utils`' — it wipes the client-side session ref. Without it the guard
 * still believes the user is logged in and bounces them straight back off /login.
 */

export const useUnauthorized = () => {
  const route = useRoute()
  const { clear } = useUserSession()

  /**
   * Sends the user to `/login` when the failure was a 401, and leaves everything else alone.
   * @param error Anything caught from `$fetch`, or the `error` ref `useFetch` exposes
   * @returns True when it redirected, so callers can stop handling the error
   */
  const handleUnauthorized = async (error: unknown): Promise<boolean> => {
    const status = (error as { statusCode?: number })?.statusCode
    if (status !== 401) return false

    await clear()
    // `redirect` carries the full path, query included, so login lands them back where they were.
    await navigateTo({ path: '/login', query: { redirect: route.fullPath } })
    return true
  }

  return { handleUnauthorized }
}
