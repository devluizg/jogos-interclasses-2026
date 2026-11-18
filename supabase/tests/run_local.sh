#!/usr/bin/env bash
# Valida migrations + testes da Fase 1 em um PostgreSQL 16 descartável.
# Uso: ./supabase/tests/run_local.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONTAINER="${CONTAINER:-jic-test}"
PORT="${PORT:-55432}"

cd "$ROOT"

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -p "${PORT}:5432" \
  postgres:16-alpine >/dev/null

pronto=0
for _ in $(seq 1 60); do
  if docker exec "$CONTAINER" psql -U postgres -tAc 'select 1' >/dev/null 2>&1; then
    pronto=$((pronto + 1))
  else
    pronto=0
  fi
  if [ "$pronto" -ge 3 ]; then
    break
  fi
  sleep 1
done

if [ "$pronto" -lt 3 ]; then
  echo "PostgreSQL não ficou pronto a tempo." >&2
  docker ps -a --filter "name=$CONTAINER"
  docker logs "$CONTAINER" >&2 || true
  exit 1
fi

psql_run() {
  docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q
}

psql_run < supabase/tests/0000_stubs.sql

for file in supabase/migrations/*.sql; do
  echo "Aplicando $file"
  psql_run < "$file"
done

echo "Rodando testes"
psql_run < supabase/tests/0001_testes_fase1.sql
