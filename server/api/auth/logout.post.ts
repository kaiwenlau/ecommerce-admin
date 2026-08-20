/**
 * `POST /api/auth/logout` — clears the session.
 * Called by the account menu in `app/layouts/default.vue`.
 *
 * Deliberately does NOT call `requireUserSession`. Logging out when already logged out should
 * succeed quietly rather than 401.
 */

export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { ok: true }
})
