FROM oven/bun

WORKDIR /var/www/api

COPY package*.json bun.lockb ./

RUN bun install

COPY . .

ENV NODE_ENV production
ENV DATABASE_URL "postgresql://postgres:postgres@host.docker.internal:5432/project-piston-db?schema=public"

RUN bun prisma:generate
RUN bun prisma:migrate:deploy
RUN bun prisma:seed


EXPOSE 8080

CMD [ "bun", "start" ]