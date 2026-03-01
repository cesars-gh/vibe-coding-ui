/**
 * prepare.js — runs after `pnpm install` (including installs from GitHub).
 *
 * When the package is installed from GitHub, dist/ is not committed,
 * so we need to build the agent-api and frontend here.
 *
 * Skips the build when dist/ already exists (e.g. local dev after a manual build).
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const agentApiDist = resolve(root, 'packages/agent-api/dist');
const frontendDist = resolve(root, 'dist/frontend');

if (existsSync(agentApiDist) && existsSync(frontendDist)) {
  // Already built — nothing to do (normal dev workflow after manual build)
  process.exit(0);
}

const run = (cmd, cwd = root) => {
  console.log(`[prepare] ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};

// Build agent-api (TypeScript → JS)
if (!existsSync(agentApiDist)) {
  run('npx tsc', resolve(root, 'packages/agent-api'));
}

// Build frontend (Vite)
if (!existsSync(frontendDist)) {
  // Install frontend dependencies that aren't hoisted to root
  const frontendDir = resolve(root, 'packages/frontend');
  if (existsSync(frontendDir)) {
    run('npm install --ignore-scripts', frontendDir);
    run('npx vite build', frontendDir);
  }
}
