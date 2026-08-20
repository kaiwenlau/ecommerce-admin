import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_LIST_QUERY_DEFAULTS,
  customerListQuerySchema,
} from '../shared/schemas/customer'
import { SEARCH_MAX_LENGTH } from '../shared/constants'

// Params come from the address bar, so every field falls back to its default instead of throwing.
describe('customerListQuerySchema', () => {
  it('defaults an empty query', () => {
    expect(customerListQuerySchema.parse({})).toEqual({ page: 1, search: '' })
  })

  it('exports those defaults', () => {
    expect(CUSTOMER_LIST_QUERY_DEFAULTS).toEqual(customerListQuerySchema.parse({}))
  })

  it('coerces a numeric page from the string the URL gives it', () => {
    expect(customerListQuerySchema.parse({ page: '3' }).page).toBe(3)
  })

  it.each(['abc', '0', '-1', '1.5', ''])('falls back to page 1 on %j', (page) => {
    expect(customerListQuerySchema.parse({ page }).page).toBe(1)
  })

  it('trims search', () => {
    expect(customerListQuerySchema.parse({ search: '  ali  ' }).search).toBe('ali')
  })

  it('drops an over-long search rather than truncating it', () => {
    const search = 'x'.repeat(SEARCH_MAX_LENGTH + 1)
    expect(customerListQuerySchema.parse({ search }).search).toBe('')
  })

  it('never throws, whatever the URL contains', () => {
    expect(() => customerListQuerySchema.parse({ page: [], search: {} })).not.toThrow()
  })
})
