# Build context is the monorepo root.
FROM node:22-bookworm-slim AS build
WORKDIR /repo
RUN corepack enable

COPY .yarnrc.yml package.json yarn.lock* ./
COPY packages/editor/package.json packages/editor/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/demo/package.json apps/demo/package.json
RUN yarn install --inline-builds

COPY . .
RUN yarn workspace server run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /repo
RUN corepack enable
ENV NODE_ENV=production

COPY --from=build /repo /repo
WORKDIR /repo/apps/server
EXPOSE 4000
CMD ["node", "dist/index.js"]
