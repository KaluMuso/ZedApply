#!/usr/bin/env bash
# Apply infra/supabase/migrations/*.sql in lexical order via psql.
# Requires SUPABASE_DB_URL (direct Postgres URI, not the REST URL).
#
# Usage:
#   export SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres'
#   ./scripts/apply_supabase_migrations.sh
#   ./scripts/apply_supabase_migrations.sh 064_job_expiration_cron.sql 065_llm_usage_log.sql
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIG_DIR="${ROOT}/infra/supabase/migrations"

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "ERROR: SUPABASE_DB_URL is not set." >&2
  echo "Set the direct Postgres connection string from Supabase Dashboard → Settings → Database." >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql not found. Install postgresql-client." >&2
  exit 1
fi

if [[ "$#" -gt 0 ]]; then
  FILES=("$@")
  for f in "${FILES[@]}"; do
    if [[ ! -f "${MIG_DIR}/${f}" && ! -f "${f}" ]]; then
      echo "ERROR: migration not found: ${f}" >&2
      exit 1
    fi
  done
  SQL_FILES=()
  for f in "${FILES[@]}"; do
    if [[ -f "${f}" ]]; then
      SQL_FILES+=("${f}")
    else
      SQL_FILES+=("${MIG_DIR}/${f}")
    fi
  done
else
  mapfile -t SQL_FILES < <(find "${MIG_DIR}" -maxdepth 1 -name '*.sql' | sort)
fi

echo "Applying ${#SQL_FILES[@]} migration file(s) to database..."
for sql in "${SQL_FILES[@]}"; do
  echo "==> $(basename "${sql}")"
  psql "${SUPABASE_DB_URL}" -v ON_ERROR_STOP=1 -f "${sql}"
done
echo "Done."
