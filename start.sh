#!/bin/sh

set -e 

echo "Running Prisma Migrations..."
bun prisma:migrate:deploy
# TODO: For now do migrate dev, because i don't include migrations in git history this is a bit fucky, later you can remove this
# once we start tracking migation files
bun prisma:migrate:dev -- --skip-generate

echo "Generating Prisma Client..."
bun prisma:generate

# TODO: This take a very long time.. So run it manually when necessary
# echo "Seeding Database..."
# bun prisma:seed

echo "Starting Application..."
exec bun start  # Use exec so the process properly replaces the shell