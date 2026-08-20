/**
 * `POST /api/auth/login` — checks an email and password, and opens a session on success.
 * Called by `app/pages/login.vue`, which then refreshes `useUserSession()` so the route guard
 * sees the new state before it runs.
 *
 * A wrong email and a wrong password come back as the SAME 401 message. Telling them apart
 * would let anyone probe which addresses have an account.
 *
 * A malformed body comes back as 422 with `{ fieldErrors }` — the one shape every form in this
 * app knows how to read. See server/utils/fieldErrors.ts.
 */

import { z } from 'zod'
import { MESSAGES } from '#shared/constants'
import { loginSchema } from '#shared/schemas/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = loginSchema.safeParse(body)

  if (!result.success) {
    setResponseStatus(event, 422)
    return {
      fieldErrors: z.flattenError(result.error).fieldErrors,
    }
  }

  const { email, password } = result.data
  const admin = await prisma.adminUser.findUnique({ where: { email } })

  // Same message whether the email or the password is wrong
  if (!admin || !await verifyPassword(admin.passwordHash, password)) {
    setResponseStatus(event, 401)
    return {
      message: MESSAGES.badCredentials,
    }
  }

  await setUserSession(event, {
    user: {
      id: admin.id,
      email: admin.email,
    },
  })

  return { ok: true }
})
