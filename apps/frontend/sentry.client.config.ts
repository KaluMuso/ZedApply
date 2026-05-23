import * as Sentry from "@sentry/nextjs";
import { getSentryInitOptions } from "./sentry.shared";

const { dsn, ...options } = getSentryInitOptions();

if (dsn) {
  Sentry.init({
    dsn,
    ...options,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Hydration failed because the initial UI does not match",
      "Text content does not match server-rendered HTML",
      "Network Error",
    ],
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 0.1,
  });
}
