FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/uploads

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "dist/index.cjs"]
