# Navbar navigation investigation (Track 4b-polish #6)

**Reported symptom:** Clicking Jobs / Matches / Pricing in the navbar causes a full page reload (Kaluba, May 2026).

**PRs #38 + #39:** Already replaced `<a href>` with Next.js `<Link>` in `Navbar.tsx`.

## Findings

### 1. Navbar implementation is correct

| Location | Mechanism | Notes |
|----------|-----------|-------|
| Desktop nav (`Navbar.tsx` L57–66) | `<Link href={...}>` | No `window.location`, no `<a href>` for main links |
| Mobile menu (`Navbar.tsx` L190–205) | `<Link>` + `onClick` closes menu only | Does not force navigation |
| Logo | `<Link href="/">` | Client navigation |
| Mobile bottom bar (`MobileTabBar.tsx`) | `router.push(href)` | Client-side; separate from navbar |

There is **no second desktop navbar**. Mobile uses the same `navLinks` array inside the hamburger overlay.

### 2. `useAuth()` does not explain a document reload

`Navbar` calls `useAuth()`, which re-renders the navbar subtree when auth state changes. That can feel like a “flash” but is **not** a browser full reload (no new document request, no white flash from scratch unless the destination page remounts with a skeleton).

### 3. Primary UX culprit: `/matches` full-page skeleton on every visit

`matches/page.tsx` previously set `loading=true` on mount and rendered a **full-page skeleton** until `loadMatches()` finished. On client navigation from Jobs → Matches, the entire content area swaps to skeleton — users often describe this as “the page refreshed.”

**Mitigation in this PR:** Hydrate from `sessionStorage` cache when available and only show the skeleton when there is no cached data (`showInitialSkeleton = (loading || authLoading) && !data`).

### 4. Secondary: production PWA service worker

`public/sw.js` uses **cache-first** for non-`/_next/` GET requests. On a hard navigation (or if client routing fails), HTML can be served from cache. This does not affect normal `<Link>` transitions, which fetch RSC/flight payloads via `/_next/` (network-first in the SW).

**Recommendation:** If hard reloads still feel stale after the matches cache fix, change document navigations to network-first or exclude App Router HTML from cache-first.

### 5. Not a cause

- No `window.location` on navbar links (grep clean except unrelated `ErrorBoundary` / PWA hostname check).
- `/pricing` is a public page; same `<Link>` pattern.

## Conclusion

**No navbar markup bug found.** The perceived reload is overwhelmingly the **matches page remount + skeleton**, with a possible **PWA cache-first** contribution on hard reloads in production.

## Next steps (if symptoms persist)

1. Confirm in DevTools Network whether navigation shows `document` (full reload) vs `fetch` to `/_next/data` (SPA).
2. Consider `loading.tsx` with lightweight shell instead of in-page skeleton for `/matches`.
3. Audit `sw.js` to network-first for HTML document requests on `zedapply.com`.
