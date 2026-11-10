// Shared by the site and the tests, so the rule is defined in exactly one place.

/** Brand list prices not re-confirmed within this many days are hidden. */
export const LIST_PRICE_MAX_AGE_DAYS = 45;

/** @param {string | undefined} checkedAt YYYY-MM-DD  @param {number} now ms */
export function isPriceDateFresh(checkedAt, now = Date.now(), maxDays = LIST_PRICE_MAX_AGE_DAYS) {
  if (!checkedAt) return false;
  const age = (now - Date.parse(checkedAt + 'T00:00:00Z')) / 86_400_000;
  return age >= -1 && age <= maxDays;
}

/** Card-friendly rounding: under $20 to the dollar, otherwise to the nearest $5. */
export function aboutPrice(n) {
  return `About $${n < 20 ? Math.round(n) : Math.round(n / 5) * 5}`;
}
