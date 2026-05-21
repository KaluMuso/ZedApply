# ZedApply Frontend Visual + UX Audit

**Date:** 2026-05-21  
**Scope:** `apps/frontend/src/` (179 source files)  
**Stack:** Next.js 14, Tailwind 3, shadcn/base-ui, custom CSS tokens in `globals.css`

---

## Executive summary

The app runs two parallel UI systems: **legacy CSS classes** (`.btn`, `.card`, `.field`, `.tag`) defined in `globals.css`, and **shadcn/base-ui primitives** (`Button`, `Input`, `Card`) that reference Tailwind semantic tokens (`primary`, `muted`, etc.) which were **not fully wired** in `:root`. Most production pages (matches, pricing, jobs, auth) use the legacy system with inline `style={{}}` and CSS variables (`var(--green-700)`). Visual refresh requires unifying tokens, then converging on one Button/Input/Card implementation.

Dark mode exists via `ThemeProvider` (class `dark` on `<html>`). Toggle lives in `Navbar`.

---

## 1. Buttons, links, and CTAs

### 1.1 Canonical systems (inconsistent)

| System | Location | Variants | Default height |
|--------|----------|----------|----------------|
| `.btn` CSS | `globals.css` | `btn-primary`, `btn-accent`, `btn-ghost`, `btn-sm`, `btn-lg` | 44px (sm 36px, lg 52px) |
| shadcn `Button` | `components/ui/button.tsx` | `default`, `outline`, `secondary`, `ghost`, `destructive`, `link` | **32px** (`h-8`) — below touch target |
| Raw `<button>` | pricing FAQ, matches filters, admin | Ad-hoc inline styles | Varies |

**Frequency:** ~60 usages of `className="btn …"` across 25 files; shadcn `Button` used mainly in admin tabs and newer shared components.

### 1.2 Grouped by visual style

| Style | Implementation | Used on |
|-------|----------------|---------|
| Primary green | `.btn-primary` / `var(--green-700)` | Navbar sign-in, matches CTAs, job empty states |
| Copper accent | `.btn-accent` / `var(--accent)` | Pricing highlight tier, profile upgrade, matches upgrade |
| Ghost outline | `.btn-ghost` | Secondary actions, pagination, filters |
| Inline unstyled | `style={{ background: "none", border: "none" }}` | Pricing FAQ accordion triggers |
| shadcn default | `bg-primary` (often mismatched with brand green) | Admin `Tabs`, sparse |

### 1.3 Inconsistencies

- **Two primary greens:** Tailwind `brand-500` / `zambian-green-500` = `#198754` vs spec target `#0E5C3A` (`--green-700` = `#0f5132`).
- **Success semantics:** `text-emerald-*` / `bg-amber-*` in `features/JobCard.tsx`, `MatchScore.tsx` vs `var(--success)` / `tag-green` elsewhere.
- **shadcn Button too small** for mobile (h-8 = 32px); legacy `.btn` is 44px.
- **Loading:** pricing uses `.spinner` inside btn; no shared `loading` prop on `Button`.
- **Links as buttons:** `<Link className="btn btn-primary">` — not using `Button` + `asChild`.

---

## 2. Colour tokens

### 2.1 Token sources

| Source | Examples | Files |
|--------|----------|-------|
| CSS vars `:root` | `--green-*`, `--copper-*`, `--bg`, `--ink` | `globals.css`, most pages |
| Tailwind extend | `zambian.green`, `brand`, `cream` | `tailwind.config.ts`, sparse class usage |
| Literal hex in components | `#faf7f2`, `#25D366`, `#15803d`, `rgba(...)` | `HomePageClient`, `MobileTabBar`, `SplashScreen`, `matches/page` |
| shadcn semantic | `text-muted-foreground`, `bg-primary` | admin tabs, `EmptyState`, `OfflineBanner` |

### 2.2 Semantic conflicts (same meaning, different tokens)

| Semantic | Variants found | Where |
|----------|----------------|-------|
| Success / match | `var(--green-500)`, `var(--success)`, `text-emerald-*`, `bg-brand-*` | matches, JobCard, features |
| Warning | `var(--warn)`, `amber-50/100/900`, `tag-orange` | admin-guard, OfflineBanner, review queue |
| Danger | `var(--danger)`, `destructive`, `#fde8e8` in DeadlineBadge | forms, badges |
| Primary CTA | `green-700`, `brand-600`, `copper-500` accent | buttons, marketing |
| Muted text | `var(--muted)`, `text-muted-foreground`, `cream-500` | body copy |

### 2.3 Frequency

- **CSS variables:** dominant on marketing, matches, pricing, jobs (~80% of styled surfaces).
- **Tailwind semantic classes:** growing in admin + shared (`EmptyState`, `OfflineBanner`).
- **Literal hex/rgba in TSX:** 40+ occurrences (should move to tokens only).

---

## 3. Typography

| Role | Current | Spec target |
|------|---------|-------------|
| Display | Instrument Serif (`--font-instrument-serif`) | Crimson Pro 400/600 |
| Body | Inter (`--font-inter`) | Inter 400–700 ✓ |
| Mono / eyebrow | JetBrains Mono 11px | Keep mono eyebrow |
| Body size | 14px in `.btn`, `.field`; 16px rare on mobile | **15px mobile, 16px desktop**, lh 1.6 |
| Headings | `clamp()` inline styles, `font-display` class | Mixed scale |

**Divergences:** `text-xs` (12px) on tier subtitles; `text-[0.8rem]` on shadcn sm button; profile/admin use `text-2xl font-bold` vs `font-display` elsewhere.

---

## 4. Spacing

**Tailwind scale violations (non-standard):**

- `gap-3.5`, `p-3.5` — auth, HomePageClient, matches (14px — not on 4/6/8 scale).

**Card padding inconsistency:**

- `.card` + `p-6 md:p-8` (pricing)
- shadcn Card `py-4 px-4`
- Job cards custom margins

**Spec spacing scale:** 4, 6, 8, 12, 16, 24, 32, 48 only.

---

## 5. Form inputs

| Pattern | Border / focus | Height | Mobile font |
|---------|----------------|--------|-------------|
| `.field` | 1px `--line-2`, green glow | 44px | 14px — **iOS zoom risk** |
| shadcn `Input` | `ring-3 ring-ring/50` | 32px (`h-8`) | `text-base` md:`text-sm` |
| Auth phone | custom grid + digits | mixed | — |
| Auth OTP | **6 separate boxes** | 48×40px each | violates spec (single field) |
| `OTPInput` feature | 6 boxes (duplicate pattern) | h-12 | not used in auth |

**Error states:** auth sets `error` string; inconsistent red border on fields. No shared `FormField` helper.

---

## 6. Loading states

| Area | Behavior | Gap |
|------|----------|-----|
| `/matches` | Skeleton implied via `loading` state + empty | No card skeletons |
| `/jobs` | loading.tsx exists for `[id]` | List page can flash blank |
| `/pricing` | tier fetch silent fallback | No skeleton for cards |
| `/admin` | `if (!token) return null` | Blank flash |
| Profile | "Could not load profile" | OK error copy |
| Global | `loading.tsx` at app root | Minimal |

**Spinner:** `.spinner` in globals (white ring) — not theme-aware on light buttons.

---

## 7. Error states

| Surface | Backend error handling |
|---------|------------------------|
| `error.tsx` | Friendly copy + refresh ✓ |
| `ErrorBoundary` | Friendly + reload ✓ |
| API calls | Often `toast.error(err.message)` — raw backend text |
| Auth | `err instanceof Error ? err.message` ✓ |
| Matches | ApiError 401 → redirect | Other errors may toast only |

**Risk:** Unhandled 500 on sign-in surfaces as CORS in browser (documented in AGENTS.md).

---

## 8. Accessibility

| Issue | Severity | Examples |
|-------|----------|----------|
| Icon buttons without `aria-label` | Medium | Some `Icon` only controls in jobs filters |
| OTP 6-box | Medium | 6 focus stops; spec wants one labeled input |
| Focus rings | Partial | `:focus-visible` global; shadcn uses ring-3 |
| Contrast | Medium | `var(--muted)` on `--bg` ~4.2:1 in places; copper on cream OK |
| FAQ buttons | Low | No `aria-expanded` on pricing accordion |
| Modals | Partial | InterviewPrepModal — verify focus trap |

**aria-label count:** ~30 files have some labels; not exhaustive on icon-only controls.

---

## 9. Mobile viewport (380 / 414 / 768)

| Breakpoint | Issues noted |
|------------|--------------|
| 380px | Pricing table `overflow-x-auto` ✓; match-row grid stacks via CSS; filter chips may wrap tightly |
| 414px | MobileTabBar 80px — CTAs use `--mobile-tabbar-offset` ✓ |
| 768px | `auth-aside` hidden; matches-header single column |
| Touch targets | `.btn` 44px ✓; shadcn icon `size-8` = 32px ✗; filter `btn-sm` 36px borderline |
| Font < 15px | `text-xs`, `eyebrow` 11px, btn-sm 13px |
| Horizontal scroll | jobs filters bar, comparison table — intentional scroll |

---

## 10. Page screenshots (description)

### `/pricing` — light

- Cream page background (`#faf7f2`), centered eyebrow "Pricing", large serif headline with copper italic "fair".
- Four column cards on desktop; Starter card has copper border gradient, "Most Popular" pill overlapping top edge.
- Prices in large serif (K0, K125, K250, K500); green checkmarks on feature lists.
- CTA buttons: copper accent on Starter, ghost on others; comparison table below; FAQ accordion cards.

### `/pricing` — dark

- Near-black background, elevated dark cards, copper accent desaturated brighter; green checks shift to `--green-400`.

### `/matches` — light

- Greeting with avatar, tier label, match quota text; refresh button with optional countdown ring (30s).
- Score filter chips (btn-sm), sort toggle; match rows as cards with score ring, skills tags, apply/save actions.
- Sticky upgrade CTA at bottom on mobile; empty state links to profile/pricing.

### `/matches` — dark

- Same layout; score ring track uses `--line-2`; muted text lighter.

### `/jobs/[id]` — light

- Job title serif, company meta, deadline badge (color by urgency), JobDescription markdown body.
- Apply CTA sticky above mobile tab bar; sidebar match breakdown on desktop (if present in JobDetailClient).

### `/admin` — light

- shadcn Tabs horizontal strip; mixed tab content — some tables borderless, some `btn` styles.
- Review queue uses amber pills for flags; stats cards vary padding.

### `/signup` `/login` (`/auth`) — light

- Split grid: green gradient aside (hidden mobile) + form card.
- Phone input with +260 prefix; **six OTP boxes**; consent checkbox; primary full-width btn.

### `/onboarding`

- No dedicated `/onboarding` route. Onboarding ≈ `/profile` CV upload (`CvSkillsTab`), preferences, progress implied by profile completeness meter — **no step indicator (1 of 3)**.

---

## 11. PWA (pre-fix notes)

- `manifest.json` present; PNG icons exist under `public/icons/`.
- `sw.js` registered in `PWAProvider` (skipped on localhost).
- Duplicate dead `RegisterServiceWorker` in unused `AppProviders`.
- **Missing:** `beforeinstallprompt` UI on `/matches`; install criteria audit in `docs/pwa_audit.md`.
- Offline: `OfflineBanner` exists but **not mounted** in root layout.

---

## 12. Recommended fix order (implemented in Track 5 PR)

1. Design tokens in `globals.css` + `tailwind.config.ts` + shadcn HSL variables  
2. Unify `Button`, `Input`, `Card`, new `Pill`, `EmptyState`, `Skeleton`, `ErrorBoundary`  
3. Migrate `.btn` usages to `Button` on high-traffic routes  
4. Auth: single OTP + phone inputs; profile progress steps  
5. PWA: manifest colors, SW strategy, `InstallPrompt`, mount `OfflineBanner`  
6. Vitest layout snapshots at 380px and 1024px  

---

## 13. Files with highest churn expected

- `globals.css`, `tailwind.config.ts`, `layout.tsx` (fonts)
- `components/ui/button.tsx`, `input.tsx`, `card.tsx`
- `app/pricing/page.tsx`, `app/matches/page.tsx`, `app/auth/AuthPageClient.tsx`
- `public/manifest.json`, `public/sw.js`, `components/PWAProvider.tsx`
