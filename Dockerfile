FROM node:20-slim AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN mkdir -p migrations && npm run build

FROM node:20-slim AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY docker-entrypoint.sh ./

RUN mkdir -p /app/uploads && \
    addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

ENTRYPOINT ["./docker-entrypoint.sh"]
