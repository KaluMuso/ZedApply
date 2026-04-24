# Job Scraper Workflow Plan (n8n)

## Goal
Build a daily n8n workflow that ingests Zambia job listings from:
- BestZambiaJobs.com
- GoZambiaJobs.com
- Zambia job Facebook groups (only where policy and terms allow scraping/automation)

The workflow should parse listings from HTML, normalize fields, and post each job to `POST /api/v1/jobs` before the 7:00 AM digest.

## Schedule
- Run daily at **6:00 AM Africa/Lusaka**.
- Keep current heartbeat workflow (`infra/n8n/heartbeat_workflow.json`) separate.
- Add a dedicated scraping workflow JSON export (suggested name: `infra/n8n/job_scraper_daily.json`).

## Required Output Schema
Each scraped listing must be transformed to the API contract in `docs/openapi.yaml` (`JobCreate`):
- `title` (required, min 5 chars)
- `description` (required, min 20 chars)
- `source` (required; use `scraper`)
- Optional: `company`, `location`, `requirements`, `skills_required`, `salary_min`, `salary_max`, `apply_url`, `apply_email`, `closing_date`

All money values must be converted to **ngwee** (e.g., K79.50 -> `7950`).

## Proposed n8n Node Flow
1. **Schedule Trigger** (daily 6:00 AM, Africa/Lusaka)
2. **Set/Code Node**: define target pages per site (list URLs)
3. **Split In Batches**: process one page at a time
4. **HTTP Request Node**: fetch listing HTML
5. **Code Node**: parse listing cards (title/link/location/company/snippet/date)
6. **Split In Batches**: process one job URL at a time
7. **HTTP Request Node**: fetch job detail HTML
8. **Code Node**: extract full fields + normalize to `JobCreate`
9. **IF Node**: skip invalid items (missing title/description)
10. **HTTP Request Node**: `POST /api/v1/jobs` (Bearer token auth)
11. **IF Node**: handle 201/409/4xx/5xx differently
12. **Data Store / DB Node**: log ingest result and failure reason
13. **Error Trigger / Catch**: aggregate failures and notify ops channel

## Site-by-Site Extraction Plan

### 1) BestZambiaJobs.com
- **Listing page signals to inspect**:
  - Job cards/rows containing title links
  - Company label
  - Location/meta row
  - Posted/closing date snippets
- **Detail page selectors (fallback strategy)**:
  - Primary: semantic containers (article/main/job-content)
  - Fallback: heading + nearest rich text block
  - Apply target: `a[href*="apply"]`, mailto links, or CTA button URLs
- **Normalization notes**:
  - If salary text contains ranges, parse both bounds and convert to ngwee.
  - If only one salary value appears, map to `salary_min` and leave `salary_max` null.

### 2) GoZambiaJobs.com
- **Listing page signals to inspect**:
  - Result cards with title anchor
  - Company and location metadata
  - Pagination links for first N pages
- **Detail page selectors (fallback strategy)**:
  - Job title heading
  - Description container and requirements list blocks
  - Closing date/meta info
  - Apply email or apply URL in CTA/metadata
- **Normalization notes**:
  - Convert comma-separated requirements into array entries.
  - Remove boilerplate text and repeated footer content.

### 3) Zambia Job Facebook Groups
- **Acquisition strategy**:
  - Prefer approved feed exports or moderation-approved automation.
  - If direct scraping is blocked or violates policy, switch to manual-review ingest queue.
- **Extraction targets**:
  - Post text blocks for title-like first line
  - Contact/apply info (email, WhatsApp number, links)
  - Location hints from text
- **Risk controls**:
  - Treat Facebook as low-trust input and run stricter validation before ingest.

## Rate Limiting and Crawl Safety
- Per-domain request policy:
  - 1 request every 2-4 seconds (randomized jitter)
  - Max 3 concurrent requests per domain
  - Max 100 detail pages per run per site (configurable)
- Add `User-Agent` and `Accept-Language` headers.
- Respect `robots.txt` and site terms; disable scraping where disallowed.
- Exponential backoff on 429/503:
  - Retry delays: 10s, 30s, 90s, then fail item

## Blocking / Anti-Bot Handling
- Detect blocking patterns:
  - Captcha pages
  - Unexpected redirects to challenge pages
  - Repeated 403/429 bursts
- Response plan:
  1. Stop crawling that domain for this run.
  2. Emit "site blocked" event in logs.
  3. Route affected URLs to retry queue (next day) with capped attempts.
  4. If blocked for 3 consecutive runs, require manual source review.

## Deduplication Strategy
- Primary dedupe is already in backend (`job_fingerprints` via `POST /jobs`).
- Workflow-side pre-dedupe to reduce API load:
  - Build deterministic key from normalized `title + company + first_200_chars(description)`.
  - Skip duplicates seen in current run.

## Data Quality Rules
- Must have non-empty `title` and `description`.
- Reject descriptions < 20 chars.
- Normalize location names to common Zambia cities where possible:
  - Lusaka, Kitwe, Ndola, Livingstone, Kabwe, Chingola, Mufulira
- Extract skills heuristically from requirements text:
  - Lowercase and trim
  - Keep top 5-15 likely skills to avoid noise

## Error Handling and Observability
- Persist per-item ingest logs:
  - source URL, status code, parse status, API response, timestamp
- Track run-level metrics:
  - pages fetched, jobs parsed, jobs posted, duplicates, failures
- Alerting:
  - Notify on total failure of any source
  - Notify if posted jobs < threshold (possible parser drift)

## Security and Compliance
- Store API tokens in n8n credentials/env, never hardcode.
- Do not store full user-generated content beyond required job fields.
- Respect source terms and stop scraping non-permitted endpoints.

## Rollout Plan
1. Build workflow with one source (BestZambiaJobs) and dry-run logging only.
2. Enable API posting for small batch (10-20 jobs/day).
3. Add GoZambiaJobs source once parser stability is acceptable.
4. Add Facebook channel only with compliant ingestion method.
5. Tune selectors monthly or when parse success rate drops.

## Definition of Done
- Daily 6:00 AM run executes successfully for enabled sources.
- At least 80% of scraped detail pages produce valid `JobCreate` payloads.
- Duplicate submission rate remains low (expected 409s handled cleanly).
- Failures are visible with enough metadata for quick parser updates.
