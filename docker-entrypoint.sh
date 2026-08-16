#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running prisma migrate deploy"
  ./node_modules/.bin/prisma migrate deploy
fi

exec node dist/main.js
