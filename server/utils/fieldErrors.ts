/**
 * The 422 body every failed write returns, and the two helpers that build it.
 * Called by `POST /api/products`, `PATCH /api/products/:id` and `POST /api/auth/login`.
 *
 * One shape covers two unrelated failures: a Zod rejection, which never reaches the database,
 * and a unique-index violation, which only Postgres can detect. The forms learn one shape.
 */

import { z } from 'zod'
import type { H3Event } from 'h3'
import { Prisma } from '~~/generated/prisma/client'

/**
 * The shape every failed write returns: `{ fieldErrors: { sku: ['SKU already exists'] } }`.
 * The same shape `POST /api/auth/login` returns, so the forms only learn one.
 *
 * `UForm.setErrors()` wants `[{ name, message }]`. That conversion belongs on the client, in one helper.
 */
export type FieldErrors = Record<string, string[]>

/**
 * Turns a Zod failure into the 422 body.
 * Zod 4 renamed v3's `error.flatten()` to `z.flattenError()`. Same output.
 * @param event The request, so the status can be set alongside the body
 * @param error The Zod error to flatten
 */
export const respondFieldErrors = (event: H3Event, error: z.ZodError) => {
  setResponseStatus(event, 422)
  return { fieldErrors: z.flattenError(error).fieldErrors as FieldErrors }
}

/**
 * The same 422 body, for errors Zod cannot see — a SKU that only clashes once reaches database.
 * @param event The request
 * @param name The field the error belongs under
 * @param message What to show beneath that field
 */
export const respondFieldError = (event: H3Event, name: string, message: string) => {
  setResponseStatus(event, 422)
  return { fieldErrors: { [name]: [message] } satisfies FieldErrors }
}

/**
 * Prisma throws code `P2002` when a unique index rejects a row, and names the clashing column in `error.meta.target`.
 * Uncaught, the user gets a page of raw Prisma text in a toast; caught here, one line under the SKU box.
 *
 * Product has one uniqueness rule — the index on `sku WHERE deleted_at IS NULL` —
 * so any P2002 from this table means the SKU.
 * @param error The thrown value to inspect
 * @returns The clashing field name, or null when this is not a P2002
 */
export const uniqueViolationField = (error: unknown): string | null => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null
  }

  const target = error.meta?.target
  const field = Array.isArray(target) ? String(target[0]) : String(target ?? '')

  // The index is named, not column-derived, so fall back to the field it covers.
  return field.includes('sku') || !field ? 'sku' : field
}
