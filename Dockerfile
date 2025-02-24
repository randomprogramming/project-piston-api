FROM oven/bun

WORKDIR /var/www/api

COPY package*.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

EXPOSE 8080

RUN chmod +x start.sh
CMD ["./start.sh"]