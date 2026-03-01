#!/usr/bin/env node

import { resolve } from 'node:path';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'start') {
  // Parse --port flag
  let port;
  const portIdx = args.indexOf('--port');
  if (portIdx !== -1 && args[portIdx + 1]) {
    port = Number.parseInt(args[portIdx + 1], 10);
    if (Number.isNaN(port)) {
      console.error('Error: --port must be a number');
      process.exit(1);
    }
  }

  const cwd = resolve(process.cwd());

  // Prefer built JS when installed, fall back to source during dev
  let resolveConfig;
  let startServer;
  try {
    ({ resolveConfig } = await import('../packages/agent-api/dist/config.js'));
    ({ startServer } = await import('../packages/agent-api/dist/index.js'));
  } catch {
    // Note: for dev, run via tsx so TS is handled
    try {
      ({ resolveConfig } = await import('../packages/agent-api/src/config.js'));
      ({ startServer } = await import('../packages/agent-api/src/index.js'));
    } catch (err) {
      console.error(
        'Failed to load agent API. Did you run "pnpm build" and "pnpm build:api"?\n',
      );
      console.error(err);
      process.exit(1);
    }
  }

  const config = resolveConfig({ cwd, port });
  startServer(config);
} else if (command === '--help' || command === '-h') {
  console.log(`
  vibe-coding — AI-powered coding assistant UI

  Usage:
    vibe-coding start [--port 8000]

  Options:
    --port    Port to run the server on (default: 8000)

  Config:
    Place a .vibecoding.json in your project root:
    {
      "preview": true,
      "previewUrl": "http://localhost:3000",
      "systemPrompt": "You are working on a React app...",
      "port": 8000
    }

  Environment:
    ANTHROPIC_API_KEY   Required. Your Anthropic API key.
  `);
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "vibe-coding --help" for usage information.');
  process.exit(1);
}
