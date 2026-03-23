FROM node:20 AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-slim AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm install drizzle-kit tsx

COPY --from=build /app/dist ./dist
COPY shared ./shared
COPY drizzle.config.ts ./

RUN mkdir -p /app/uploads

EXPOSE 5000

ENV NODE_ENV=production

CMD ["sh", "-c", "npx drizzle-kit push --force && node dist/index.cjs"]
