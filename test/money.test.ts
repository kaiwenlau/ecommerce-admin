import { describe, expect, it } from 'vitest'
import { formatCents } from '../app/utils/money'

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
