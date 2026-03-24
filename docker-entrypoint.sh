#!/bin/sh
set -e

echo "Running database migrations..."
node dist/migrate.cjs

echo "Starting HRSuite..."
exec node dist/index.cjs "$@"
