// lib/catalog/featured.ts
// Which products the homepage puts in front of a customer.
//
// Pure and dependency-free on purpose: the server page and the client grid both
// import it, so it must not pull `lib/db` into the browser bundle.

/** How many cards the homepage "Featured essentials" rail renders. */
export const FEATURED_LIMIT = 8;

/**
 * How many rows to ask the catalog for before picking. Wider than the rail so
 * out-of-stock rows can be demoted without leaving gaps.
 */
export const FEATURED_FETCH_SIZE = 24;

/** Query string the client grid uses so its refetch matches the server render. */
export const FEATURED_QUERY = `pageSize=${FEATURED_FETCH_SIZE}&sort=newest`;

interface FeaturableProduct {
  sellableStock?: number | null;
  stockQty?: number | null;
}

/**
 * Order the homepage rail: sellable products first, everything else after,
 * newest-first within each group (the caller supplies newest-first input).
 *
 * The rail used to be "whatever the default sort returned", which is
 * `ORDER BY name_en ASC` — so it showed the eight alphabetically-first active
 * products and nothing an operator did could get a new product onto the home
 * page, while deactivating one shifted in an arbitrary replacement. Sorting by
 * recency and demoting empty stock makes the rail respond to catalog work.
 */
export function pickFeatured<T extends FeaturableProduct>(
  items: readonly T[],
  limit: number = FEATURED_LIMIT
): T[] {
  const sellable = (p: T) => (p.sellableStock ?? p.stockQty ?? 0) > 0;
  const inStock = items.filter(sellable);
  const outOfStock = items.filter((p) => !sellable(p));
  return [...inStock, ...outOfStock].slice(0, limit);
}
