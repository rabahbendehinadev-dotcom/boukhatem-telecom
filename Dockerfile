# =============================================================================
# Multi-stage Dockerfile — BOUKHATEM TELECOM
# =============================================================================
# IMPORTANT: Uses node:22-bookworm-slim (Debian glibc), NOT Alpine.
# Alpine uses musl libc; the pnpm-workspace.yaml overrides explicitly exclude
# linux-x64-musl binaries for esbuild, @tailwindcss/oxide, and rollup.
# Attempting to build on Alpine will fail for those native binaries.
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Enable pnpm via corepack (pinned to workspace version)
RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# ── Copy workspace manifests first (maximises Docker layer cache) ─────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy package.json for every workspace package we need to build
# (must mirror the structure so pnpm can resolve workspace:* links)
COPY lib/db/package.json                  lib/db/
COPY lib/api-zod/package.json             lib/api-zod/
COPY lib/api-client-react/package.json    lib/api-client-react/
COPY lib/object-storage-web/package.json  lib/object-storage-web/
COPY artifacts/api-server/package.json    artifacts/api-server/
COPY artifacts/repaire-phone-dz/package.json artifacts/repaire-phone-dz/

# Install ALL dependencies (devDeps required for the build step)
RUN pnpm install --frozen-lockfile

# ── Copy all source files ─────────────────────────────────────────────────────
COPY tsconfig.base.json tsconfig.json ./
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
COPY artifacts/repaire-phone-dz/ artifacts/repaire-phone-dz/

# ── Build frontend SPA → artifacts/repaire-phone-dz/dist/public ──────────────
ENV NODE_ENV=production
RUN pnpm --filter @workspace/repaire-phone-dz run build

# ── Build API server → artifacts/api-server/dist/ ────────────────────────────
RUN pnpm --filter @workspace/api-server run build


# ── Stage 2: Production runner ────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy package.json for runtime deps resolution
# (workspace:* links must be satisfiable even if source is absent)
COPY lib/db/package.json                  lib/db/
COPY lib/api-zod/package.json             lib/api-zod/
COPY lib/api-client-react/package.json    lib/api-client-react/
COPY lib/object-storage-web/package.json  lib/object-storage-web/
COPY artifacts/api-server/package.json    artifacts/api-server/

# Install production dependencies only (skip devDeps)
# Workspace packages are linked as symlinks — source not needed since
# their code is already inlined in the esbuild bundle.
RUN pnpm install --frozen-lockfile --prod

# ── Copy built artifacts ──────────────────────────────────────────────────────
# API server bundle (index.mjs + migrate.mjs + pino worker files)
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

# Frontend SPA (served as static files by Express in production)
COPY --from=builder /app/artifacts/repaire-phone-dz/dist/public ./public

# Database migrations — SQL files needed by migrate.mjs at runtime
# drizzle-orm's migrator reads these directly from the filesystem
COPY --from=builder /app/lib/db/migrations ./lib/db/migrations

# ── Runtime configuration ─────────────────────────────────────────────────────
ENV NODE_ENV=production
# PORT must be supplied at runtime (e.g. -e PORT=8080 or via Dokploy)
ENV PORT=8080
# Default uploads directory — override with UPLOADS_DIR env var if needed.
# Mount a persistent volume at /app/uploads in Dokploy so images survive
# container rebuilds and redeployments.
ENV UPLOADS_DIR=/app/uploads

# Create the uploads directory and ensure the node user can write to it
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

EXPOSE 8080

# Healthcheck — ensures the container is ready before routing traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the API server only.
# Migrations are intentionally NOT run automatically on startup — run them
# manually when needed with:
#   docker exec <container> node artifacts/api-server/dist/migrate.mjs
# or via Dokploy one-off command:
#   node artifacts/api-server/dist/migrate.mjs
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
