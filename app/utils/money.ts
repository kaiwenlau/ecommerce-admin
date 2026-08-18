import { CENTS_PER_UNIT, MONEY_CURRENCY, MONEY_LOCALE } from '#shared/constants'

// Money is stored as whole cents in DB, format to decimal before display to users
// Reference: docs/decisions/DATABASE-DESIGN.md §1.

// format cents to currency string, according MYR locale and currency
const currency = new Intl.NumberFormat(MONEY_LOCALE, {
  style: 'currency',
  currency: MONEY_CURRENCY,
})

/**
 * Formats a value in cents as a currency string.
 * @param cents The amount in cents.
 * @returns The formatted currency string.
 */
export const formatCents = (cents: number): string => {
  return currency.format(cents / CENTS_PER_UNIT)
}
