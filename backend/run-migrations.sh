#!/bin/bash
set -e

echo "Waiting for PostgreSQL..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" 2>/dev/null; do
    sleep 1
done

echo "Running migrations..."
for migration_dir in /app/migrations/*/; do
    migration_name=$(basename "$migration_dir")
    echo "  Applying: $migration_name"
    psql "$DATABASE_URL" -f "$migration_dir/up.sql" 2>/dev/null || true
done

echo "Migrations complete."
exec "$@"
