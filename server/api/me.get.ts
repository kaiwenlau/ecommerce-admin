/**
 * `GET /api/me` — the signed-in admin, or 401 when there is no session.
 *
 * NOTHING IN `app/` CALLS THIS. The client reads its session through `useUserSession()`, which
 * nuxt-auth-utils serves from its own `/api/_auth/session` route. This one survives as a curl
 * smoke test — the shortest way to ask whether a session cookie is still valid.
 */

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return { user }
})
