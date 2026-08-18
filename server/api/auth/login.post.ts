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
