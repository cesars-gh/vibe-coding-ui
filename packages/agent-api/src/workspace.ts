import { execFile as execFileCb } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { WorkspaceConfig } from './config.js';

const execFile = promisify(execFileCb);

function buildAuthUrl(repoUrl: string, token: string): string {
  // Only inject token for HTTPS URLs; SSH URLs use key-based auth
  try {
    const url = new URL(repoUrl);
    url.username = token;
    return url.toString();
  } catch {
    // Not a valid URL (e.g. git@github.com:org/repo.git) — return as-is
    console.warn(
      '[workspace] Cannot inject token into non-HTTPS URL, skipping auth injection',
    );
    return repoUrl;
  }
}

function getCloneUrl(repoUrl: string, token: string | undefined): string {
  if (token) {
    return buildAuthUrl(repoUrl, token);
  }
  return repoUrl;
}

async function run(cmd: string, args: string[], cwd?: string): Promise<string> {
  const { stdout } = await execFile(cmd, args, { cwd });
  return stdout.trim();
}

export async function ensureWorkspace(
  config: WorkspaceConfig,
): Promise<string> {
  const { websiteRepoUrl, websiteRepoBranch, workspaceDir, websiteGitToken } =
    config;

  const gitDir = path.join(workspaceDir, '.git');
  const cloneUrl = getCloneUrl(websiteRepoUrl, websiteGitToken);

  if (!existsSync(gitDir)) {
    console.log(`[workspace] Cloning ${websiteRepoUrl} → ${workspaceDir}`);
    await run('git', [
      'clone',
      '--branch',
      websiteRepoBranch,
      '--single-branch',
      cloneUrl,
      workspaceDir,
    ]);
  } else {
    console.log('[workspace] Existing workspace found, syncing with remote...');
    // Update remote URL in case token changed
    await run('git', ['remote', 'set-url', 'origin', cloneUrl], workspaceDir);
    await run('git', ['fetch', 'origin'], workspaceDir);
    await run(
      'git',
      ['reset', '--hard', `origin/${websiteRepoBranch}`],
      workspaceDir,
    );
  }

  // Ensure git identity is configured for commits
  await run(
    'git',
    ['config', 'user.email', 'agent@vibe-coding.local'],
    workspaceDir,
  );
  await run('git', ['config', 'user.name', 'Vibe Coding Agent'], workspaceDir);

  // Install dependencies based on lockfile
  await installDeps(workspaceDir);

  const absPath = path.resolve(workspaceDir);
  console.log(`[workspace] Ready at ${absPath}`);
  return absPath;
}

async function installDeps(dir: string): Promise<void> {
  const hasPnpmLock = existsSync(path.join(dir, 'pnpm-lock.yaml'));
  const hasNpmLock = existsSync(path.join(dir, 'package-lock.json'));

  if (hasPnpmLock) {
    console.log('[workspace] Installing deps with pnpm...');
    await run('pnpm', ['install', '--frozen-lockfile'], dir);
  } else if (hasNpmLock) {
    console.log('[workspace] Installing deps with npm...');
    await run('npm', ['ci'], dir);
  } else {
    console.log(
      '[workspace] Installing deps with pnpm (no lockfile detected)...',
    );
    await run('pnpm', ['install'], dir);
  }
}
