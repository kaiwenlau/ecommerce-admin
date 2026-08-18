/**
 * Lives in `./shared` dir so browser and server route validate against the SAME rules.
 * If this file changes, both sides change together
 */

import { z } from 'zod'
import { MESSAGES, PASSWORD_MIN_LENGTH } from '#shared/constants'

const emailSchema = z
  .string()
  .min(1, MESSAGES.emailRequired)
  .check(z.email({ error: MESSAGES.invalidEmail }))

const passwordSchema = z
  .string()
  .min(1, MESSAGES.passwordRequired)
  .min(PASSWORD_MIN_LENGTH, MESSAGES.passwordTooShort)

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
