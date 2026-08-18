import { describe, expect, it } from 'vitest'
import { formatCents, parseCents } from '../shared/utils/money'

// Intl puts a non-breaking space after "RM". Normalise it.
// The assertions are about digits, grouping and sign.
const fmt = (cents: number) => formatCents(cents).replace(/\u00A0/g, ' ')

describe('formatCents', () => {
  it('divides cents into units', () => {
    expect(fmt(1999)).toBe('RM 19.99')
  })

  it('always shows two decimals', () => {
    expect(fmt(0)).toBe('RM 0.00')
    expect(fmt(50)).toBe('RM 0.50')
  })

  it('groups thousands', () => {
    expect(fmt(123456)).toBe('RM 1,234.56')
  })

  it('keeps the sign in front', () => {
    expect(fmt(-500)).toBe('-RM 5.00')
  })
})

// The inverse of formatCents.
// `productCreateSchema` will runs the regex first so it gives digits at most 2 decimals.
describe('parseCents', () => {
  it('turns the typed price into whole cents', () => {
    expect(parseCents('19.99')).toBe(1999)
  })

  // 19.99 * 100 is 1998.9999999999998, so cut decimals off will loses a cent.
  it.each([
    ['19.99', 1999],
    ['0.01', 1],
    ['1', 100],
    ['1.1', 110],
    ['1234.56', 123456],
  ])('rounds %j to %i', (value, cents) => {
    expect(parseCents(value)).toBe(cents)
  })

  it('round-trips through formatCents', () => {
    expect(fmt(parseCents('1234.56'))).toBe('RM 1,234.56')
  })
})
