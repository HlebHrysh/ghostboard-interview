#!/bin/sh
# Production entrypoint: apply pending Prisma migrations (idempotent), then start Next.js.
# Set SKIP_DB_MIGRATE=true to skip (e.g. when migrations run as a separate Cloud Run Job / CI step).
set -e

if [ "$NODE_ENV" = "production" ] && [ "$SKIP_DB_MIGRATE" != "true" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo "[entrypoint] FATAL: DATABASE_URL is not set in production." >&2
    exit 1
  fi
  echo "[entrypoint] Applying Prisma migrations (prisma migrate deploy)..."
  node node_modules/prisma/build/index.js migrate deploy --schema=prisma/schema.prisma
fi

exec node server.js
