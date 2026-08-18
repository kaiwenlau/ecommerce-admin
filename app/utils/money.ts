// Money is stored as whole cents in DB, format to decimal before display to users
// Reference: docs/decisions/DATABASE-DESIGN.md §1.

// format cents to currency string, according MYR locale and currency
const currency = new Intl.NumberFormat('en-MY', {
  style: 'currency',
  currency: 'MYR',
})

/**
 * Formats a value in cents as a currency string.
 * @param cents The amount in cents.
 * @returns The formatted currency string.
 */
export const formatCents = (cents: number): string => {
  return currency.format(cents / 100)
}
