# project-piston-api

Project Piston Express API

## Development

1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install API dependencies

```bash
bun install
```

3. Set up ENV variables:

```bash
cp .env.dist .env
```

4. Set up database

    1. Run a PostgreSQL database (easiest way is through Docker)
    2. Set your database username and password in the `DATABASE_URL` variable inside the `.env` file
    3. Run `bun run prisma:migrate:dev` to migrate your database to the latest changes
    4. Run `bun run prisma:generate` to generate the neccessary database files

5. Run the API

```bash
bun run dev
```
