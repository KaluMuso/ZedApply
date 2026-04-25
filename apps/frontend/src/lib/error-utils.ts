import { ApiError } from "./api";

export function getErrorMessage(
  err: unknown,
  fallback: string
): { message: string; isAuth: boolean; isRateLimit: boolean; isNetwork: boolean } {
  if (err instanceof TypeError) {
    return { message: "You appear to be offline. Check your connection and try again.", isAuth: false, isRateLimit: false, isNetwork: true };
  }
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return { message: "Please sign in again to continue.", isAuth: true, isRateLimit: false, isNetwork: false };
    }
    if (err.status === 429) {
      return { message: "Too many requests. Please wait a bit and try again.", isAuth: false, isRateLimit: true, isNetwork: false };
    }
    if (err.status >= 500) {
      return { message: "Something went wrong on our side. Please try again shortly.", isAuth: false, isRateLimit: false, isNetwork: false };
    }
    return { message: err.detail || fallback, isAuth: false, isRateLimit: false, isNetwork: false };
  }
  if (err instanceof Error) {
    return { message: err.message, isAuth: false, isRateLimit: false, isNetwork: false };
  }
  return { message: fallback, isAuth: false, isRateLimit: false, isNetwork: false };
}
