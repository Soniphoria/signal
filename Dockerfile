ARG NODE_VERSION=lts-alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /code

COPY . .
RUN npm install && npm run build

FROM node:${NODE_VERSION} AS runner

WORKDIR /web

ENV NODE_ENV=production

COPY --from=builder /code/dist ./dist
COPY scripts/railway-server.mjs ./scripts/railway-server.mjs

EXPOSE 3000

CMD [ "node", "scripts/railway-server.mjs" ]
