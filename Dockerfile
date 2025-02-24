FROM oven/bun

WORKDIR /var/www/api

COPY package*.json bun.lockb ./

RUN bun install

COPY . .

ENV NODE_ENV production

RUN bun prisma:generate
RUN bun prisma:migrate:deploy
RUN bun prisma:seed


EXPOSE 8080

CMD [ "bun", "start" ]