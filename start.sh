#!/bin/sh

set -e 

echo "Running Prisma Migrations..."
bun prisma:migrate:deploy

echo "Generating Prisma Client..."
bun prisma:generate

# TODO: This take a very long time.. So run it manually when necessary
# echo "Seeding Database..."
# bun prisma:seed

echo "Starting Application..."
exec bun start  # Use exec so the process properly replaces the shell