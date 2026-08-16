#!/usr/bin/env bash
set -eu

# Дамп Postgres (custom format). Правила маршрутизации — критичные данные.
# Запуск в nix-shell / direnv, где есть pg_dump:
#   pnpm backup
# Восстановление:
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backups/notihub-....dump

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${BACKUP_KEEP:-14}"
mkdir -p "$DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DIR/notihub-$STAMP.dump"

pg_dump --format=custom --file="$FILE" "$DATABASE_URL"
echo "Wrote $FILE"

if command -v find >/dev/null; then
  mapfile -t old < <(find "$DIR" -name 'notihub-*.dump' -type f | sort | head -n -"$KEEP")
  if ((${#old[@]} > 0)); then
    rm -f "${old[@]}"
    echo "Removed ${#old[@]} old dump(s), keeping last $KEEP"
  fi
fi
