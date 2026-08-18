import { describe, expect, it } from 'vitest'
import {
  PRODUCT_LIST_QUERY_DEFAULTS,
  productListQuerySchema,
} from '../shared/schemas/product'
import { SEARCH_MAX_LENGTH } from '../shared/constants'

// Params from address bar, so every field falls back to its default instead of throwing.
// Write endpoints do the opposite.
describe('productListQuerySchema', () => {
  it('defaults an empty query', () => {
    expect(productListQuerySchema.parse({})).toEqual({
      page: 1,
      search: '',
      status: '',
      sort: 'name',
      dir: 'asc',
    })
  })

  it('exports those defaults', () => {
    expect(PRODUCT_LIST_QUERY_DEFAULTS).toEqual(productListQuerySchema.parse({}))
  })

  it('coerces a numeric page from the string the URL gives it', () => {
    expect(productListQuerySchema.parse({ page: '3' }).page).toBe(3)
  })

  it.each(['abc', '0', '-1', '1.5', ''])('falls back to page 1 on %j', (page) => {
    expect(productListQuerySchema.parse({ page }).page).toBe(1)
  })

  it('trims search', () => {
    expect(productListQuerySchema.parse({ search: '  lamp  ' }).search).toBe('lamp')
  })

  it('drops an over-long search rather than truncating it', () => {
    const search = 'x'.repeat(SEARCH_MAX_LENGTH + 1)
    expect(productListQuerySchema.parse({ search }).search).toBe('')
  })

  it('accepts the real statuses and blanks anything else', () => {
    expect(productListQuerySchema.parse({ status: 'archived' }).status).toBe('archived')
    expect(productListQuerySchema.parse({ status: '' }).status).toBe('')
    expect(productListQuerySchema.parse({ status: 'deleted' }).status).toBe('')
  })

  it('falls back to name/asc on an unknown sort or direction', () => {
    const parsed = productListQuerySchema.parse({ sort: 'price', dir: 'desc' })
    expect(parsed).toMatchObject({ sort: 'price', dir: 'desc' })

    const bad = productListQuerySchema.parse({ sort: 'createdAt', dir: 'sideways' })
    expect(bad).toMatchObject({ sort: 'name', dir: 'asc' })
  })

  it('never throws, whatever the URL contains', () => {
    expect(() => productListQuerySchema.parse({
      page: [], search: {}, status: 42, sort: null, dir: false,
    })).not.toThrow()
  })
})
