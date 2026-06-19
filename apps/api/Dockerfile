FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
ENV PNPM_HOME="/pnpm" PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./ 
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @eduportal/api... --filter @eduportal/shared...

FROM base AS build
COPY --from=deps /app /app
COPY tsconfig.base.json ./
COPY apps/api/ apps/api/
COPY packages/shared/ packages/shared/
RUN pnpm --filter @eduportal/shared run build || true
RUN cd apps/api && pnpm exec prisma generate
RUN cd apps/api && pnpm run build

FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./ 
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --prod --frozen-lockfile --filter @eduportal/api... --filter @eduportal/shared...

FROM oven/bun:1.1-alpine AS runner
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=prod-deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=prod-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
USER app
EXPOSE 3001
WORKDIR /app/apps/api
CMD ["bun", "dist/index.js"]
