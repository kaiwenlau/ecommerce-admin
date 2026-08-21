// validation
export const PASSWORD_MIN_LENGTH = 8
export const SEARCH_MAX_LENGTH = 100
export const SKU_MAX_LENGTH = 32
export const NAME_MAX_LENGTH = 120
export const DESCRIPTION_MAX_LENGTH = 2000
export const CATEGORY_MAX_LENGTH = 60
export const PRICE_MAX_UNITS = 1_000_000
export const STOCK_MAX = 1_000_000

// pagination
export const PAGE_SIZE = 20

// money
export const MONEY_LOCALE = 'en-MY'
export const MONEY_CURRENCY = 'MYR'
export const CENTS_PER_UNIT = 100

// dates
export const DISPLAY_TIME_ZONE = 'Asia/Kuala_Lumpur'

// ui
export const SEARCH_DEBOUNCE_MS = 300
export const TABLE_SKELETON_ROWS = 8

// messages
export const MESSAGES = {
  missingDatabaseUrl: 'DATABASE_URL is not set. Copy .env.example to .env.',
  emailRequired: 'Email is required',
  invalidEmail: 'Invalid email address',
  passwordRequired: 'Password is required',
  passwordTooShort: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  badCredentials: 'Incorrect email or password',
  unexpected: 'Something went wrong. Please try again.',

  // product form
  skuRequired: 'SKU is required',
  skuTooLong: `SKU must be at most ${SKU_MAX_LENGTH} characters`,
  skuTaken: 'SKU already exists',
  nameRequired: 'Name is required',
  nameTooLong: `Name must be at most ${NAME_MAX_LENGTH} characters`,
  descriptionTooLong: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
  categoryRequired: 'Category is required',
  categoryTooLong: `Category must be at most ${CATEGORY_MAX_LENGTH} characters`,
  priceRequired: 'Price is required',
  priceInvalid: 'Price must be a number, with at most 2 decimal places',
  priceNotPositive: 'Price must be greater than 0',
  priceTooLarge: `Price must be less than ${PRICE_MAX_UNITS}`,
  stockInvalid: 'Stock must be a whole number',
  stockNegative: 'Stock cannot be negative',
  stockTooLarge: `Stock must be at most ${STOCK_MAX}`,
  statusInvalid: 'Pick a status',

  // product write endpoints
  productNotFound: 'Product not found',
  productOnOpenOrders: 'This product is on orders that still have to be fulfilled',
  productNotDeleted: 'That product is not deleted, so there is nothing to undo',
  skuReused: 'Cannot undelete: another live product has taken that SKU',

  // order placing
  orderNeedsItems: 'An order needs at least one item',
  orderQtyInvalid: 'Quantity must be a whole number, 1 or more',
  productNotSellable: 'This product cannot be put on a new order',
  productOutOfStock: 'Not enough stock left for this order',

  // confirm modals — archive and delete are different features, so they must not read alike
  archiveTitle: 'Archive this product?',
  archiveBody: 'It disappears from the active list but keeps its SKU, and you can bring it back at any time by setting the status to active.',
  archiveConfirm: 'Archive',
  deleteTitle: 'Delete this product?',
  deleteBody: 'This cannot be undone here, and the SKU is freed for a new product to use.',
  deleteConfirm: 'Delete',
  cancel: 'Cancel',

  // toasts
  productCreated: 'Product created',
  productUpdated: 'Product saved',
  productArchived: 'Product archived',
  productDeleted: 'Product deleted',

  // pages
  productLoadFailed: 'Could not load this product',
  retry: 'Retry',

  // tracing pages
  customerNotFound: 'Customer not found',
  customerLoadFailed: 'Could not load this customer',
  customersLoadFailed: 'Could not load customers',
  orderNotFound: 'Order not found',
  orderLoadFailed: 'Could not load this order',
  noBuyers: 'No one has bought this yet.',
  noCustomers: 'No customers yet.',
  noCustomerMatches: 'No customers match this search.',
  noOrders: 'This customer has not ordered anything yet.',
  productDeletedBanner: 'This product is deleted. It stays reachable so old orders keep working, but it cannot be edited or sold.',
  productRestored: 'Product restored',
} as const

/**
 * The delete modal's warning line. Finished orders do NOT block the delete — they are history,
 * and `checkRemovable()` in server/utils/productRemovable.ts returns the count without failing.
 * @param count How many shipped or delivered orders mention this product
 */
export const finishedOrderWarning = (count: number) =>
  `This product appears on ${count} completed order${count === 1 ? '' : 's'}. That sales history is kept.`
