/**
 * Safely convert a Unix millisecond timestamp (number or string) to a Date object.
 * The database stores timestamps as bigint/number, but superjson serializes them
 * as strings. `new Date("1776243218000")` is invalid — must use `new Date(Number(...))`.
 */
export function tsToDate(ts: string | number | null | undefined): Date {
  if (ts == null) return new Date(NaN);
  return new Date(Number(ts));
}

/**
 * Format a Unix millisecond timestamp for display. Returns empty string if invalid.
 */
export function formatTs(
  ts: string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = tsToDate(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, options);
}
