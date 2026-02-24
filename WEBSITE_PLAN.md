# Website Independence Plan

## Context

Currently `packages/website` is tightly coupled to the monorepo — agent-api has hardcoded `../../website` paths, the Dockerfile copies it at build time, and there's a fake `git init` to satisfy Claude Code. The goal is to make the website its own git repo that agent-api clones at runtime, so the Claude agent can commit/push changes upstream without polluting the root repo. No git submodules.

## New Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `WEBSITE_REPO_URL` | Yes | — | Git clone URL (HTTPS or SSH) |
| `WEBSITE_REPO_BRANCH` | No | `main` | Branch to clone/checkout |
| `WEBSITE_WORKSPACE_DIR` | No | `./workspace` | Local clone destination (gitignored) |
| `WEBSITE_GIT_TOKEN` | No | — | PAT for HTTPS push auth (injected into remote URL) |

## Implementation Steps

### 1. Create the website as its own repo

Before any code changes — push current `packages/website/` contents to a new git repository.

### 2. New file: `packages/agent-api/src/config.ts`

Centralized config that reads and validates env vars:
- `websiteRepoUrl` (required, throw if missing)
- `websiteRepoBranch` (default: `main`)
- `workspaceDir` (resolved to absolute path, default: `./workspace`)
- `websiteGitToken` (optional)

### 3. New file: `packages/agent-api/src/workspace.ts`

Exports `ensureWorkspace(): Promise<string>` — returns absolute path to the ready workspace.

**Logic:**
1. If `workspaceDir` has no `.git/` → `git clone --branch <branch> --single-branch <url> <dir>`
2. If `.git/` exists → `git fetch origin && git reset --hard origin/<branch>` (clean sync)
3. If `WEBSITE_GIT_TOKEN` set → `git remote set-url origin https://<token>@...` for push auth
4. Detect lockfile type and install deps (`pnpm install` / `npm install`)
5. Return the absolute path

Uses `node:child_process` `execFile` (promisified). All blocking — server doesn't start until workspace is ready.

### 4. Modify: `packages/agent-api/src/astro-server.ts`

Remove hardcoded path from factory function:

```diff
-export function createAstroServer(): AstroDevServer {
-  const websiteDir = path.resolve(
-    new URL('.', import.meta.url).pathname,
-    '../../website',
-  );
-  return new AstroDevServer(websiteDir);
-}
+export function createAstroServer(websiteDir: string): AstroDevServer {
+  return new AstroDevServer(websiteDir);
+}
```

No other changes — `AstroDevServer` already accepts `websiteDir` in its constructor.

### 5. Modify: `packages/agent-api/src/agent.ts`

Replace hardcoded `WEBSITE_CWD` with a settable value:

```diff
-const WEBSITE_CWD = path.resolve(
-  new URL('.', import.meta.url).pathname,
-  '../../website',
-);
+let WEBSITE_CWD: string;
+
+export function setWebsiteCwd(dir: string) {
+  WEBSITE_CWD = dir;
+}
```

Extend `SYSTEM_APPEND` to tell the agent it can use git:

```
- You can use git to commit and push your changes
- Always commit with meaningful messages
- The project is a git repo with a remote you can push to
```

**Note on `.claude/settings.local.json`:** The agent SDK already reads it from the `cwd` directory when `settingSources: ['project']` is set (agent.ts:57). Since CWD becomes the cloned workspace, the website repo's settings are picked up automatically. No code change needed.

### 6. Modify: `packages/agent-api/src/index.ts`

Wire workspace setup before anything else:

```typescript
import { ensureWorkspace } from './workspace.js';
import { setWebsiteCwd } from './agent.js';

// Before server starts:
const websiteDir = await ensureWorkspace();
setWebsiteCwd(websiteDir);
const astroServer = createAstroServer(websiteDir);
```

Convert the `.then()` chain to top-level await for cleaner flow.

### 7. Monorepo cleanup

- **`.gitignore`** — add `workspace/`
- **`pnpm-workspace.yaml`** — change to explicit list: `packages/agent-api`, `packages/frontend`
- **`package.json`** — remove `dev:website` script
- **`packages/website/`** — remove from monorepo (already in its own repo)

### 8. Dockerfile changes

**Remove:**
- `COPY packages/website/package.json packages/website/` (line 11)
- `COPY packages/website/ packages/website/` (line 38)
- `pnpm --filter website exec astro preferences disable devToolbar` (line 41)
- `git init && git add -A && git commit -m "init"` (line 50)

**Add:**
- Install git: `RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*`
- Keep `git config` for user identity (needed for commits from the agent)
- Pass env vars through `docker-compose.yml`

**docker-compose.yml** — add environment section:
```yaml
environment:
  - WEBSITE_REPO_URL=${WEBSITE_REPO_URL}
  - WEBSITE_REPO_BRANCH=${WEBSITE_REPO_BRANCH:-main}
  - WEBSITE_GIT_TOKEN=${WEBSITE_GIT_TOKEN:-}
  - WEBSITE_WORKSPACE_DIR=/app/workspace
```

Include a named volume for `/app/workspace` to persist across container restarts and avoid re-cloning.

### 9. Frontend changes

**None.** The iframe already loads from `VITE_ASTRO_ORIGIN` (default `http://localhost:4321`). Astro still runs on 4321, just from a different directory.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Cold start time (clone + install) | Use volume mount in Docker to persist workspace; `ensureWorkspace` does incremental pull if already cloned |
| Stale workspace from previous session | `git fetch + reset --hard` ensures clean sync with upstream on every restart |
| `npx astro` not found in cloned workspace | `ensureWorkspace` installs deps; `npx` resolves from workspace `node_modules/.bin` |
| Git auth for pushing | HTTPS token injection into remote URL; SSH would need key mounting |
| Lockfile mismatch | Detect `pnpm-lock.yaml` vs `package-lock.json` and use the right package manager |

## Implementation Checklist

- [ ] **Prep: Create website repo** — push `packages/website/` to a new git repo, add `.claude/settings.local.json`
- [ ] **Step 2: `config.ts`** — new file, env var loading + validation (`WEBSITE_REPO_URL` required)
- [ ] **Step 3: `workspace.ts`** — new file, clone/pull logic, dep install, return workspace path
- [ ] **Step 4: `astro-server.ts`** — remove hardcoded path, accept `websiteDir` param
- [ ] **Step 5: `agent.ts`** — replace hardcoded `WEBSITE_CWD` with `setWebsiteCwd()`, add git instructions to system prompt
- [ ] **Step 6: `index.ts`** — wire `ensureWorkspace()` → `setWebsiteCwd()` → `createAstroServer(dir)` before server start
- [ ] **Step 7: Monorepo cleanup** — `.gitignore` add `workspace/`, update `pnpm-workspace.yaml`, remove `dev:website` script, remove `packages/website/`
- [ ] **Step 8: Dockerfile** — remove website COPY lines, remove fake `git init`, add `git` install, update `docker-compose.yml` env vars
- [ ] **Step 9: `.env.example`** — add the 4 new env vars with comments
- [ ] **Verify: Local** — clone works, Astro starts, agent edits + commits + pushes, HMR works in frontend
- [ ] **Verify: Docker** — `docker compose up` with env vars, same flow works in container

## Verification

1. Create a test website repo with a basic Astro site + `.claude/settings.local.json`
2. Set `WEBSITE_REPO_URL` in `.env`, run `pnpm dev:all`
3. Confirm workspace cloned to `./workspace/`, Astro starts on 4321
4. Send a chat message asking Claude to edit a page — verify HMR updates in preview
5. Ask Claude to commit and push — verify the commit appears in the remote repo
6. Restart agent-api — confirm it pulls latest instead of re-cloning
7. Docker: `docker compose up`, verify same flow works in container
