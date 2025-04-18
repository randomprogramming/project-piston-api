FROM oven/bun

WORKDIR /var/www/api

# OpenSSL & libssl-dev (for Prisma)
RUN apt-get update && apt-get install -y openssl libssl-dev

COPY package*.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

# Need this variable in build time
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

EXPOSE 8080

RUN chmod +x start.sh
CMD ["./start.sh"]
