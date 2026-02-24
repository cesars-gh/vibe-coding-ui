# ---- Base ----
FROM node:22 AS base
RUN corepack enable
WORKDIR /app

# ---- Install dependencies ----
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/agent-api/package.json packages/agent-api/
COPY packages/frontend/package.json packages/frontend/
COPY packages/website/package.json packages/website/
RUN pnpm install --frozen-lockfile

# ---- Build frontend ----
FROM deps AS frontend-build
COPY tsconfig.base.json ./
COPY packages/frontend/ packages/frontend/
RUN pnpm --filter frontend build

# ---- Frontend (nginx) ----
FROM nginx:1.27-alpine AS frontend
COPY --from=frontend-build /app/packages/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

# ---- App (agent-api + website) ----
FROM base AS app

# Create non-root user (Claude Code blocks --dangerously-skip-permissions as root)
RUN useradd -m -s /bin/bash appuser

# Copy installed node_modules and package manifests from deps stage
COPY --from=deps /app ./

# Copy source code and config
COPY tsconfig.base.json ./
COPY packages/agent-api/ packages/agent-api/
COPY packages/website/ packages/website/

# Disable Astro dev toolbar
RUN pnpm --filter website exec astro preferences disable devToolbar

# Hand ownership to appuser and switch
RUN chown -R appuser:appuser /app
USER appuser

# Initialize git repo (Claude Code requires a git repo)
RUN git config --global user.email "docker@localhost" \
    && git config --global user.name "Docker" \
    && git init && git add -A && git commit -m "init"

ENV NODE_OPTIONS="--max-old-space-size=512"
EXPOSE 3000 4321
CMD ["pnpm", "exec", "tsx", "packages/agent-api/src/index.ts"]
