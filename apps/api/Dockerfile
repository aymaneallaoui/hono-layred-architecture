# Build from the monorepo root: docker build -f apps/api/Dockerfile -t app .
FROM oven/bun:1 AS build
WORKDIR /repo

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN bun install --frozen-lockfile --ignore-scripts

COPY apps/api apps/api
COPY apps/web apps/web
COPY packages packages
COPY tsconfig.json turbo.json ./

ENV NODE_ENV=production
RUN cd apps/web && bun run build
RUN cd apps/api && bun build --compile --minify-whitespace --minify-syntax --target bun --outfile dist/server src/index.ts

FROM gcr.io/distroless/base
WORKDIR /app
COPY --from=build /repo/apps/api/dist/server server
COPY --from=build /repo/apps/web/dist web
ENV NODE_ENV=production PORT=3001 WEB_DIST_DIR=/app/web
EXPOSE 3001
CMD ["./server"]
