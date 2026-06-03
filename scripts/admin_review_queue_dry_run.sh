#!/usr/bin/env bash
# Review queue safe dismiss — curl helper for prod ops.
# See docs/RUNBOOK_REVIEW_QUEUE_CLEAR.md
#
# Required:
#   ADMIN_JWT  — admin/superadmin session Bearer token (not ADMIN_API_KEY)
# Optional:
#   API_URL    — default https://api.zedapply.com/api/v1
#   DRY_RUN    — true (default) | false
set -euo pipefail

API_URL="${API_URL:-https://api.zedapply.com/api/v1}"
DRY_RUN="${DRY_RUN:-true}"

if [[ -z "${ADMIN_JWT:-}" ]]; then
  echo "error: set ADMIN_JWT to an admin session JWT (Bearer)" >&2
  exit 1
fi

case "$DRY_RUN" in
  true|false) ;;
  *)
    echo "error: DRY_RUN must be true or false (got: $DRY_RUN)" >&2
    exit 1
    ;;
esac

auth_header=( -H "Authorization: Bearer ${ADMIN_JWT}" )
json_header=( -H "Content-Type: application/json" )

echo "== GET ${API_URL}/admin/review-jobs/overview =="
curl -sS "${API_URL}/admin/review-jobs/overview" "${auth_header[@]}" | jq .

echo ""
echo "== POST ${API_URL}/admin/review-jobs/bulk-dismiss-safe (dry_run=${DRY_RUN}) =="
curl -sS -X POST "${API_URL}/admin/review-jobs/bulk-dismiss-safe" \
  "${auth_header[@]}" "${json_header[@]}" \
  -d "{\"dry_run\": ${DRY_RUN}}" | jq .

if [[ "$DRY_RUN" == "false" ]]; then
  echo ""
  echo "== POST apply complete — overview after =="
  curl -sS "${API_URL}/admin/review-jobs/overview" "${auth_header[@]}" | jq .
fi
