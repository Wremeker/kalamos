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
ARG VITE_API_BASE=http://localhost:4000
ENV VITE_API_BASE=$VITE_API_BASE
RUN yarn workspace @kalamos/editor run build && yarn workspace demo run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/demo/dist /usr/share/nginx/html
EXPOSE 80
