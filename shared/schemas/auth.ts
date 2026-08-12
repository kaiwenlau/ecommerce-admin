import { z } from 'zod'

// Lives in `./shared` dir so browser and server route validate against the SAME rules.
// If this file changes, both sides change together

const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .check(z.email({ error: 'Invalid email address' }))

const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
})

export type LoginInput = z.infer<typeof loginSchema>
