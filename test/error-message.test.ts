/**
 * The code 409 archive/delete guard throws has to reach the modal as readable text.
 * The empty-string case is the one that matters: it renders as a modal with nothing in it.
 */

import { describe, expect, it } from 'vitest'
import { errorMessage } from '../app/utils/errorMessage'
import { MESSAGES } from '../shared/constants'

const REFUSAL = 'This product is on orders that still have to be fulfilled (10).'

describe('errorMessage', () => {
  // Catch a bug where the HTTP reason phrase was preferred over the JSON body.
  it('prefers the JSON body over the HTTP reason phrase', () => {
    const error = { data: { statusCode: 409, statusMessage: REFUSAL }, statusMessage: 'Conflict' }

    expect(errorMessage(error)).toBe(REFUSAL)
  })

  // What HTTP/2 and most proxies give you: `response.statusText` is ''.
  it('still finds the text when the HTTP reason phrase is missing', () => {
    const error = { data: { statusCode: 409, statusMessage: REFUSAL }, statusMessage: '' }

    expect(errorMessage(error)).toBe(REFUSAL)
  })

  // Some error bodies carry `message` and no `statusMessage`. Still readable text.
  it('falls back to the body\'s `message`', () => {
    expect(errorMessage({ data: { message: REFUSAL } })).toBe(REFUSAL)
  })

  // Catch a bug where `'' ?? fallback` is `''`, so the alert rendered blank or not at all.
  it('never returns an empty string', () => {
    expect(errorMessage({ statusMessage: '', data: { statusMessage: '' } })).toBe(MESSAGES.unexpected)
    expect(errorMessage(new Error('boom'))).toBe(MESSAGES.unexpected)
    expect(errorMessage(null)).toBe(MESSAGES.unexpected)
  })

  it('takes a caller-supplied fallback', () => {
    expect(errorMessage(null, MESSAGES.productLoadFailed)).toBe(MESSAGES.productLoadFailed)
  })
})
