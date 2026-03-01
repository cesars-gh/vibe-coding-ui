import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface VibeCodingConfig {
  cwd: string;
  port: number;
  preview?: {
    url: string;
  };
  systemPrompt?: string;
}

interface ConfigFileSchema {
  preview?: boolean;
  previewUrl?: string;
  systemPrompt?: string;
  port?: number;
}

export function loadConfigFile(cwd: string): ConfigFileSchema {
  const configPath = path.join(cwd, '.vibecoding.json');
  if (!existsSync(configPath)) return {};

  try {
    const raw = readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as ConfigFileSchema;
  } catch (err) {
    console.warn(
      `[config] Failed to parse .vibecoding.json: ${(err as Error).message}`,
    );
    return {};
  }
}

export function resolveConfig(options: {
  cwd: string;
  port?: number;
}): VibeCodingConfig {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Set it in your environment or .env file.',
    );
  }

  const fileConfig = loadConfigFile(options.cwd);

  const config: VibeCodingConfig = {
    cwd: path.resolve(options.cwd),
    port: options.port ?? fileConfig.port ?? 8000,
  };

  if (fileConfig.preview && fileConfig.previewUrl) {
    config.preview = { url: fileConfig.previewUrl };
  }

  if (fileConfig.systemPrompt) {
    config.systemPrompt = fileConfig.systemPrompt;
  }

  return config;
}
