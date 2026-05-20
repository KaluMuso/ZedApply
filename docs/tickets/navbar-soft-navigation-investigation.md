# Navbar navigation — full page reload investigation (2026-05)

## Summary

The primary desktop and mobile nav in `apps/frontend/src/components/Navbar.tsx`
already uses Next.js `Link` for **Jobs**, **Matches**, and **Pricing**. The mobile
drawer menu uses `Link` as well. There is no second navbar component with raw
`<a href>` for those three routes.

`useAuth()` in the navbar only reads context; it does not trigger
`window.location` or full document navigation on route change.

## Likely cause of “full reload” reports (production)

`public/sw.js` used a **cache-first** handler for all same-origin GET requests
that were not under `/_next/` or `/api/`. Next.js App Router client navigations
issue requests that carry **RSC** / **Next-Router-Prefetch** headers or a
**`_rsc`** query parameter. Those responses must not be served from a stale
static cache, or the client can fall back to behaviour that feels like a full
page reload.

**Change in this PR:** the service worker now returns early (default browser
fetch) for RSC / prefetch / `_rsc` requests so they always hit the network.

## Other notes

- **MobileTabBar** (`apps/frontend/src/components/MobileTabBar.tsx`) uses
  `router.push()` for the bottom tabs. That is still client-side navigation in
  Next.js 14; it is not `window.location`.
- If issues persist after the SW fix, next checks would be: browser extensions,
  “Open in new tab” gestures, and any marketing pages that still use plain
  `<a href>` (search the repo for `href="/jobs"` etc.).
