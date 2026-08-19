/**
 * The conversion from server field errors to the shape `UForm.setErrors()` expects.
 *
 * The server and `UForm` disagree about the shape of a field error.
 *
 *   server/utils/fieldErrors.ts sends  { fieldErrors: { sku: ['SKU already exists'] } }
 *   UForm.setErrors() wants           [{ name: 'sku', message: 'SKU already exists' }]
 */

import type { FormError } from '@nuxt/ui'

/**
 * What `$fetch` throws. Its `data` is the JSON body the handler returned.
 * - 422 - `{ fieldErrors }` object.
 * - 409 - no such key from archive/delete guard.
 */
type ErrorWithData = {
  data?: { fieldErrors?: Record<string, string[] | undefined> }
}

/**
 * Turns a failed write into the list `UForm.setErrors()` wants.
 *
 * Returns an empty array for non field-error response.
 *
 * @param error The value caught from a `$fetch` call
 * @returns One entry per message; `name` matches the `name` on the `UFormField`
 */
export const toFormErrors = (error: unknown): FormError[] => {
  const fieldErrors = (error as ErrorWithData)?.data?.fieldErrors

  if (!fieldErrors || typeof fieldErrors !== 'object') return []

  // Zod can report several problems on one field, so each name maps to an array of messages.
  return Object.entries(fieldErrors).flatMap(([name, messages]) =>
    (messages ?? []).map(message => ({ name, message })),
  )
}
