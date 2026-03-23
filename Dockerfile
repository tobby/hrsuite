FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install drizzle-kit tsx

COPY --from=build /app/dist ./dist
COPY shared ./shared
COPY drizzle.config.ts ./

RUN mkdir -p /app/uploads && \
    addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/index.cjs"]
