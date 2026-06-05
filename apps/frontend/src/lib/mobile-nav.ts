/** Routes where the bottom tab bar + minimal mobile header are shown. */
export const MOBILE_TAB_ROUTES = [
  "/matches",
  "/jobs",
  "/profile",
  "/pricing",
  "/applications",
  "/dashboard",
  "/settings",
  "/interview-prep",
] as const;

export function showMobileAppShell(
  pathname: string,
  isAuthenticated: boolean,
): boolean {
  return (
    isAuthenticated &&
    MOBILE_TAB_ROUTES.some((route) => pathname.startsWith(route))
  );
}
