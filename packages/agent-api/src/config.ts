import path from 'node:path';

export interface WorkspaceConfig {
  websiteRepoUrl: string;
  websiteRepoBranch: string;
  workspaceDir: string;
  websiteGitToken: string | undefined;
}

export function loadConfig(): WorkspaceConfig {
  const websiteRepoUrl = process.env.WEBSITE_REPO_URL;
  if (!websiteRepoUrl) {
    throw new Error(
      'WEBSITE_REPO_URL is required. Set it to the git clone URL of your website repo.',
    );
  }

  const websiteRepoBranch = process.env.WEBSITE_REPO_BRANCH || 'main';
  const workspaceDir = path.resolve(
    process.env.WEBSITE_WORKSPACE_DIR || './workspace',
  );
  const websiteGitToken = process.env.WEBSITE_GIT_TOKEN || undefined;

  return { websiteRepoUrl, websiteRepoBranch, workspaceDir, websiteGitToken };
}
