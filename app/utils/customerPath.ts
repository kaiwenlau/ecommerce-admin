/**
 * Builds the URL for one customer's endpoints.
 *
 * @param id The customer id
 */
export const customerPath = (id: number | string): string => `/api/customers/${id}`
