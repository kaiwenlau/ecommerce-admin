/**
 * Builds the URL for one product's endpoints.
 *
 * @param id The product id
 * @param suffix Extra path segment, e.g. `'removable'`
 */
export const productPath = (id: number | string, suffix = ''): string =>
  `/api/products/${id}${suffix ? `/${suffix}` : ''}`
