# SEO launch checklist (manual)

Complete these steps in production after Phase 11 metadata ships. The app already serves `sitemap.xml`, `robots.txt`, per-route titles/descriptions, OG images, and homepage JSON-LD.

## Prerequisites

- Production URL: `https://www.zedapply.com` (`NEXT_PUBLIC_SITE_URL` on Vercel)
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` set in Vercel when you have the meta tag from Search Console
- Plausible analytics domain configured (existing — do not add extra trackers)

## Google Search Console (GSC)

1. Sign in at [Google Search Console](https://search.google.com/search-console)
2. Add property **URL prefix**: `https://www.zedapply.com`
3. Verify ownership via HTML tag → copy value into Vercel env `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, redeploy frontend
4. Submit sitemap: `https://www.zedapply.com/sitemap.xml`
5. Inspect URL for homepage and a sample `/jobs/{id}` permalink; request indexing for homepage + `/jobs` hub
6. Monitor **Pages** and **Experience** (Core Web Vitals) weekly for the first month

## Bing Webmaster Tools

1. Sign in at [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add site `https://www.zedapply.com` (import from GSC if available)
3. Submit the same sitemap URL: `https://www.zedapply.com/sitemap.xml`
4. Use **URL Inspection** on `/pricing` and `/security` after deploy

## Google Business Profile (GMB)

Zed Apply is a digital product; a full storefront listing is optional. If Vergeo Group maintains a physical office in Lusaka:

1. Claim or create a profile at [Google Business Profile](https://business.google.com)
2. Category: **Software company** or **Employment agency** (pick the closest fit)
3. Website: `https://www.zedapply.com`
4. Add logo (512×512 from `/icons/icon-512.png`), hours, and support phone if public
5. Post a short “soft launch” update linking to `/pricing`

## Post-launch smoke (5 minutes)

| Check | Expected |
| --- | --- |
| `curl -sI https://www.zedapply.com/robots.txt` | `200`, `Sitemap:` line present, `Disallow: /admin/` |
| `curl -s https://www.zedapply.com/sitemap.xml` | Contains `/`, `/jobs`, `/pricing`, `/security`, legal URLs; **no** `/admin` |
| View source on `/` | `<title>`, `og:title`, `og:image`, JSON-LD `Organization` + `WebSite` |
| FAQ on homepage | Matching weights **50 / 20 / 15 / 10 / 5** (not 60/30/10) |
| Rich Results Test | [Job posting test](https://search.google.com/test/rich-results) on a live `/jobs/{id}` URL |

## Ongoing

- Re-submit sitemap after large job-ingestion spikes (optional; hourly revalidation already refreshes job URLs)
- Keep `docs/openapi.yaml` and marketing copy aligned with matching weights in `infra/supabase/migrations/` RPC
- Do not index `/admin`, `/auth`, or `/profile` — already blocked in `robots.ts`
