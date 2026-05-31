/**
 * Canonical auth URLs — never link to legacy /signin.
 */
export function authPath(next?: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/auth";
  }
  return `/auth?next=${encodeURIComponent(next)}`;
}

export const AUTH_SIGN_IN = "/auth";
export const AUTH_GET_STARTED = "/auth?next=/matches";
