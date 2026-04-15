/**
 * Safely convert a timestamp to a Date object.
 *
 * Drizzle types `timestamp` columns as `Date`, but superjson serializes them
 * as strings over the wire (e.g. "1776243218000" for Unix-ms or ISO strings).
 * `new Date("1776243218000")` is invalid — must use `new Date(Number(...))`.
 *
 * This helper handles all cases:
 *   - Already a Date  → returned as-is
 *   - Numeric string  → parsed via Number()
 *   - ISO string      → parsed via new Date(str)
 *   - number          → new Date(n)
 *   - null/undefined  → new Date(NaN)
 */
export function tsToDate(ts: Date | string | number | null | undefined): Date {
  if (ts == null) return new Date(NaN);
  if (ts instanceof Date) return ts;
  const n = Number(ts);
  if (!isNaN(n) && String(ts).trim() !== "") return new Date(n);
  return new Date(ts as string); // ISO string fallback
}

/**
 * Format a timestamp for display. Returns empty string if invalid.
 */
export function formatTs(
  ts: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = tsToDate(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, options);
}
