#!/bin/sh
set -e

# Run database migrations/push schema
echo "Initializing database..."
npx --yes prisma@6.19.1 db push

# Start the application
echo "Starting application..."
exec node server.js
