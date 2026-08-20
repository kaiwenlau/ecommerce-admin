/**
 * Builds the URL for one order's endpoint.
 *
 * @param id The order id
 */
export const orderPath = (id: number | string): string => `/api/orders/${id}`
