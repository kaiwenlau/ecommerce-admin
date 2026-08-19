/**
 * The day's core requirement in one function: a duplicate SKU has to land UNDER the SKU box.
 * If this conversion is wrong the server rejects the save and the screen shows nothing at all.
 */

import { describe, expect, it } from 'vitest'
import { toFormErrors } from '../app/utils/formErrors'

// Shaped like what `$fetch` throws: the handler's JSON body hangs off `.data`.
const fetchError = (data: unknown) => ({ data })

describe('toFormErrors', () => {
  it('turns one field error into what setErrors wants', () => {
    const error = fetchError({ fieldErrors: { sku: ['SKU already exists'] } })

    expect(toFormErrors(error)).toEqual([
      { name: 'sku', message: 'SKU already exists' },
    ])
  })

  it('keeps every field, and every message on a field', () => {
    const error = fetchError({
      fieldErrors: {
        sku: ['SKU is required'],
        priceCents: ['Price is required', 'Price must be greater than 0'],
      },
    })

    expect(toFormErrors(error)).toEqual([
      { name: 'sku', message: 'SKU is required' },
      { name: 'priceCents', message: 'Price is required' },
      { name: 'priceCents', message: 'Price must be greater than 0' },
    ])
  })

  it('returns nothing for the 409 the archive/delete guard throws', () => {
    const error = fetchError({
      statusCode: 409,
      statusMessage: 'This product is on orders that still have to be fulfilled (2).',
    })

    expect(toFormErrors(error)).toEqual([])
  })

  it('returns nothing for a body-less failure', () => {
    expect(toFormErrors(fetchError(undefined))).toEqual([])
    expect(toFormErrors(fetchError({ fieldErrors: { sku: undefined } }))).toEqual([])
    expect(toFormErrors(new Error('Network request failed'))).toEqual([])
    expect(toFormErrors(null)).toEqual([])
  })
})
