FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable
COPY package.json ./
RUN pnpm install --no-frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
COPY characters ./characters
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/characters ./characters

EXPOSE 8787
CMD ["node", "dist/server.js"]
