/**
 * The mirror image of product-list-query.test.ts.
 * That schema catches everything because it reads the address bar.
 * This one must throw, because a bad price on a form has to become a message under the price box.
 */

import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { productCreateSchema, productUpdateSchema } from '../shared/schemas/product'
import { MESSAGES, SKU_MAX_LENGTH } from '../shared/constants'

const valid = {
  sku: 'SKU-001',
  name: 'Blue Shirt',
  category: 'Shirts',
  priceCents: '19.99',
  stock: 5,
  status: 'active',
}

const fieldErrorsFor = (input: unknown) => {
  const result = productCreateSchema.safeParse(input)
  expect(result.success).toBe(false)
  return z.flattenError(result.error!).fieldErrors
}

describe('productCreateSchema', () => {
  it('accepts a complete product', () => {
    expect(productCreateSchema.parse(valid)).toEqual({
      sku: 'SKU-001',
      name: 'Blue Shirt',
      category: 'Shirts',
      priceCents: 1999,
      stock: 5,
      status: 'active',
    })
  })

  it('never falls back to a default the way the list query does', () => {
    expect(() => productCreateSchema.parse({})).toThrow()
  })

  describe('price', () => {
    it('converts the typed string to whole cents', () => {
      expect(productCreateSchema.parse({ ...valid, priceCents: '19.99' }).priceCents).toBe(1999)
    })

    // 19.99 * 100 is 1998.9999999999998, truncating loses a cent.
    it.each([
      ['19.99', 1999],
      ['0.01', 1],
      ['1', 100],
      ['1.1', 110],
      ['1234.56', 123456],
    ])('rounds %j to %i cents', (price, cents) => {
      expect(productCreateSchema.parse({ ...valid, priceCents: price }).priceCents).toBe(cents)
    })

    it.each(['0', '0.00'])('rejects %j as not positive', (price) => {
      expect(fieldErrorsFor({ ...valid, priceCents: price })?.priceCents)
        .toContain(MESSAGES.priceNotPositive)
    })

    it.each(['-1', 'abc', '19.999', '1e3', '', '  '])('rejects %j', (price) => {
      expect(fieldErrorsFor({ ...valid, priceCents: price })?.priceCents?.length).toBeGreaterThan(0)
    })

    it('rejects a number, because the form sends the string the user typed', () => {
      expect(fieldErrorsFor({ ...valid, priceCents: 19.99 })?.priceCents?.length).toBeGreaterThan(0)
    })
  })

  describe('stock', () => {
    it('accepts zero — out of stock is a real state, not an error', () => {
      expect(productCreateSchema.parse({ ...valid, stock: 0 }).stock).toBe(0)
    })

    it('rejects a negative, matching the CHECK (stock >= 0) in the migration', () => {
      expect(fieldErrorsFor({ ...valid, stock: -1 })?.stock).toContain(MESSAGES.stockNegative)
    })

    it('rejects a fraction', () => {
      expect(fieldErrorsFor({ ...valid, stock: 1.5 })?.stock).toContain(MESSAGES.stockInvalid)
    })
  })

  describe('text fields', () => {
    it('trims', () => {
      const parsed = productCreateSchema.parse({ ...valid, name: '  Blue Shirt  ' })
      expect(parsed.name).toBe('Blue Shirt')
    })

    it.each(['', '   '])('rejects a blank sku (%j)', (sku) => {
      expect(fieldErrorsFor({ ...valid, sku })?.sku).toContain(MESSAGES.skuRequired)
    })

    it('rejects an over-long sku rather than truncating it', () => {
      const sku = 'x'.repeat(SKU_MAX_LENGTH + 1)
      expect(fieldErrorsFor({ ...valid, sku })?.sku).toContain(MESSAGES.skuTooLong)
    })

    it('leaves description optional', () => {
      expect(productCreateSchema.parse(valid).description).toBeUndefined()
    })
  })

  it('rejects a status outside the three', () => {
    expect(fieldErrorsFor({ ...valid, status: 'deleted' })?.status).toContain(MESSAGES.statusInvalid)
  })

  // The reason the handler passes result.data to Prisma and never the raw body.
  it('drops keys the form never showed', () => {
    const parsed = productCreateSchema.parse({ ...valid, deletedAt: new Date(), id: 99 })
    expect(parsed).not.toHaveProperty('deletedAt')
    expect(parsed).not.toHaveProperty('id')
  })

  it('reports every bad field at once, so the form can mark them all', () => {
    const errors = fieldErrorsFor({ ...valid, sku: '', name: '', priceCents: 'abc' })
    expect(Object.keys(errors!).sort()).toEqual(['name', 'priceCents', 'sku'])
  })
})

describe('productUpdateSchema', () => {
  // archive
  it('accepts a status-only body', () => {
    expect(productUpdateSchema.parse({ status: 'archived' })).toEqual({ status: 'archived' })
  })

  it('accepts an empty body without inventing fields', () => {
    expect(productUpdateSchema.parse({})).toEqual({})
  })

  it('still converts the price when one is sent', () => {
    expect(productUpdateSchema.parse({ priceCents: '5.50' }).priceCents).toBe(550)
  })

  it('still rejects a bad value — partial means optional, not lenient', () => {
    expect(productUpdateSchema.safeParse({ priceCents: 'abc' }).success).toBe(false)
    expect(productUpdateSchema.safeParse({ stock: -1 }).success).toBe(false)
  })
})

// A missing field and without an explicit `error`, Zod will fallback to default message
describe('a missing field reads like the blank one', () => {
  it.each([
    ['sku', MESSAGES.skuRequired],
    ['name', MESSAGES.nameRequired],
    ['category', MESSAGES.categoryRequired],
    ['priceCents', MESSAGES.priceRequired],
  ])('%s', (field, message) => {
    const { [field as keyof typeof valid]: _omitted, ...rest } = valid
    expect(fieldErrorsFor(rest)?.[field]).toContain(message)
  })
})
