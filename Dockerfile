FROM node:20-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts
RUN npm rebuild

COPY . .
RUN npm run build

FROM node:20-alpine AS production

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
