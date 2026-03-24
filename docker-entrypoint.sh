#!/bin/sh
set -e

echo "Starting HRSuite..."

# Run the application (migrations run automatically at startup)
exec node dist/index.cjs "$@"
