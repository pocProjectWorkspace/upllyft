#!/bin/sh
set -e
cd /app/apps/api
echo "Running Prisma migrations..."
npx prisma db push --skip-generate
echo "Starting application..."
node dist/main.js
