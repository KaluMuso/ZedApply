# Bwana FAQ intents

Scripted FAQ patterns for **in-process** `app/services/bwana_faq.py` (preferred) and the optional
n8n **ZedApply - Bwana Chat Pipeline**. Matching is case-insensitive substring on the
user message (after trim).

| Intent ID | Trigger patterns (any match) | Response summary |
| --- | --- | --- |
| `apply` | how do i apply, how to apply, apply for jobs | Upload CV → matches → WhatsApp digest |
| `pricing` | price, pricing, cost, how much, tier, plan, live kwacha labels from `tier_config` | Free / Starter / Pro / Super Standard tiers (DB-backed) |
| `cancel` | cancel, unsubscribe, stop subscription | Settings → subscription; contact support |
| `cv_location` | where is my cv, my cv, upload cv, cv status | Link to `/profile` CV tab |
| `matches` | my matches, job matches, no matches | `/matches`; 50/20/15/10/5 scoring |
| `digest` | digest, whatsapp time, daily message, 07:00 | Daily digest ~07:00 CAT via WAHA |
| `payment` | pay, lenco, mtn, airtel, mobile money, dpo | Lenco MTN/Airtel + card via DPO |
| `algorithm` | how matching works, match score, algorithm | 50% semantic + 20% skills + 15% exp + 10% loc + 5% recency |
| `cover_letter` | cover letter | Professional tier; per-match generation |
| `tailored_cv` | tailored cv, rewrite cv, cv generator | Professional+ (not Starter) |
| `otp` | otp, verification code, login code | WhatsApp OTP; 5 min expiry |
| `settings` | settings, account, profile settings | `/settings` preferences |
| `support_hours` | hours, when open, response time | Escalation SLA from `bwana_platform_config` |
| `free_tier` | free plan, free tier | Free tier limits (from `tier_config`) |
| `starter_tier` | starter | Starter price/matches from `tier_config` — **no tailored CV** (Professional+) |
| `professional_tier` | professional, pro plan | Professional price/matches, tailored CV + cover letters |
| `super_tier` | super standard, unlimited | Super Standard price + unlimited matches |
| `interview` | interview prep, bwana interview | Super Standard `/interview-prep` |
| `privacy` | privacy, data, delete account | `/legal/privacy`; contact support |
| `hello` | hi, hello, hey bwana, good morning | Greeting as ZedApply chatbot |

## Escalation (not FAQ)

| Reason | Triggers | WAHA | Email log |
| --- | --- | --- | --- |
| `contact_admin` | contact support, support email, what's your email | Only if user also wants callback / human | Optional |
| `unsatisfied` | not satisfied, unhappy, useless, waste of time | Yes | Optional |
| `human_request` | talk to human, kaluba, support agent, real person | Yes | Optional |

Templates and phones come from `bwana_platform_config` (admin: `/admin/bwana`). See [BWANA_ADMIN.md](BWANA_ADMIN.md).

## LLM fallback

Any message that does not match FAQ or escalation goes to OpenRouter with `build_bwana_system_prompt()`
and the last five turns from `ai_cache` (`cache_type = bwana_chat`). User/history content is wrapped
with `wrap_user_content()` for injection safety.
