/**
 * Lives in `./shared` dir so both the browser and the server routes can use it.
 * If this file changes, both sides change together.
 *
 * Money is stored as whole cents in DB, format to decimal before display to users
 * Reference: docs/decisions/DATABASE-DESIGN.md §1.
 */

import { CENTS_PER_UNIT, MONEY_CURRENCY, MONEY_LOCALE } from '#shared/constants'

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

/**
 * Turns the price string a user typed into whole cents.
 * The inverse of `formatCents()` above.
 *
 * `Math.round` fix: `19.99 * 100` is `1998.9999999999998`.
 *
 * @param value The price as typed, expects digits with at most two decimal places, e.g. `"19.99"`
 * @returns The amount in whole cents, e.g. `1999`.
 */
export const parseCents = (value: string): number => {
  return Math.round(Number(value) * CENTS_PER_UNIT)
}
