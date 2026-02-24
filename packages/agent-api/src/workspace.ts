import { execFile as execFileCb } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { WorkspaceConfig } from './config.js';

const execFile = promisify(execFileCb);

function buildAuthUrl(repoUrl: string, token: string): string {
  const url = new URL(repoUrl);
  url.username = token;
  return url.toString();
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

  if (!existsSync(gitDir)) {
    console.log(`[workspace] Cloning ${websiteRepoUrl} → ${workspaceDir}`);
    await run('git', [
      'clone',
      '--branch',
      websiteRepoBranch,
      '--single-branch',
      websiteRepoUrl,
      workspaceDir,
    ]);
  } else {
    console.log('[workspace] Existing workspace found, syncing with remote...');
    await run('git', ['fetch', 'origin'], workspaceDir);
    await run(
      'git',
      ['reset', '--hard', `origin/${websiteRepoBranch}`],
      workspaceDir,
    );
  }

  // Set push auth if token provided
  if (websiteGitToken) {
    const authUrl = buildAuthUrl(websiteRepoUrl, websiteGitToken);
    await run('git', ['remote', 'set-url', 'origin', authUrl], workspaceDir);
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
