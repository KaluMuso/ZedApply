# Lenco production smoke test — results

**Status:** BLOCKED — awaiting production credentials from Lenco (Theresa Yombwe / support@lenco.co).

Do not run Phase 4 of [`lenco_production_cutover.md`](./lenco_production_cutover.md) until production
`LENCO_API_KEY`, `pub-...` public key, and dashboard webhook URL are configured. This document is the
checklist Kaluba completes after the env swap (Phases 2–3).

---

## Preconditions (Kaluba)

- [ ] Production `LENCO_API_KEY` and `LENCO_PUBLIC_KEY` received from Lenco
- [ ] OCI backend `.env` updated (`LENCO_ENV=production`, keys, `LENCO_API_URL` per cutover doc) — **not committed to git**
- [ ] Vercel production env updated (`NEXT_PUBLIC_LENCO_*`)
- [ ] Lenco dashboard webhook: `https://api.zedapply.com/api/v1/webhooks/lenco`
- [ ] Backend + frontend redeployed (Phase 3)

---

## Smoke test (K10 real mobile money)

| Step | Expected | Result | Checked |
|------|----------|--------|---------|
| Incognito [zedapply.com/pricing](https://zedapply.com/pricing) → pay **K10** (or Starter K125 per cutover doc) | Lenco widget opens, real MTN/Airtel PIN flow | _pending_ | [ ] |
| Lenco merchant dashboard | Collection shows successful | _pending_ | [ ] |
| Backend logs `docker compose logs zedcv-backend --since 5m \| grep -i lenco` | `lenco_webhook` processed, no signature errors | _pending_ | [ ] |
| Supabase `payments` row | `status = 'completed'`, `lenco_reference` / `provider_ref` set | _pending_ | [ ] |
| Supabase `users.subscription_tier` | Elevated to paid tier for test user | _pending_ | [ ] |
| Refund via Lenco dashboard | K10 (or K125) refunded | _pending_ | [ ] |
| Subscription after refund | Downgraded to `free` (or prior tier) | _pending_ | [ ] |

### SQL helpers

```sql
-- Replace phone with the test account used for the payment
SELECT subscription_tier, subscription_started_at
FROM users
WHERE phone = '+260XXXXXXXXX';

SELECT id, status, amount, provider_ref, payment_method, completed_at
FROM payments
WHERE user_id = (SELECT id FROM users WHERE phone = '+260XXXXXXXXX')
ORDER BY created_at DESC
LIMIT 3;
```

---

## Refund / downgrade behaviour

**As of 2026-05-24:** There is **no** automated subscription downgrade when a collection is
refunded or reversed in the Lenco dashboard. The webhook handler treats `reversed` as a failed
payment only on **pending** rows; it does not claw back an already-`completed` subscription.

After refunding test revenue in the Lenco dashboard, Kaluba must **manually** reset the test user's
tier in Supabase (or Admin) if a downgrade is required for a clean state.

Follow-up bug/feat: listen for `collection.reversed` (or equivalent) and downgrade — tracked separately.

---

## Agent run (Cursor Cloud)

| Item | Status |
|------|--------|
| Code: `LENCO_ENV` / `NEXT_PUBLIC_LENCO_ENV` feature flags | Done in PR |
| Production credentials in OCI `.env` | **Not verified** — agent has no OCI access |
| Live smoke test with real ZMW | **Not run** — blocked on credentials |
| Refund + auto-downgrade | **N/A** — manual tier reset required today |

**Tester:** _Kaluba_  
**Date (UTC):** _TBD after credentials_  
**Payment reference:** _TBD_  
**Notes:** _TBD_
