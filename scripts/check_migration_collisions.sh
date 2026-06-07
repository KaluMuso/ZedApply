#!/bin/bash
# Pre-commit hook content — symlink to .git/hooks/pre-commit or call from a husky setup.
set -e

dups=$(ls infra/supabase/migrations/*.sql 2>/dev/null \
  | sed 's|.*/\([0-9]*\)_.*|\1|' \
  | sort | uniq -d)

if [ -n "$dups" ]; then
  echo "ERROR: duplicate migration prefixes detected:"
  echo "$dups"
  echo ""
  echo "Rename one of the conflicting files to the next available prefix."
  exit 1
fi
