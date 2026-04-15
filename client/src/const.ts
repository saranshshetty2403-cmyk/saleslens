export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// SalesLens runs in single-user / no-auth mode.
// All tRPC procedures are public — no login is required.
// This stub is kept for compatibility with useAuth() which calls getLoginUrl().
export const getLoginUrl = (_returnPath?: string): string => {
  return "/";
};
