import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { setAgentCwd, setCustomSystemPrompt } from './agent.js';
import type { VibeCodingConfig } from './config.js';
import { createWSHandlers } from './ws-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveStaticDir(): string {
  // When running from source (tsx): packages/agent-api/src/ → ../../dist/frontend
  // When installed as package: dist/frontend relative to package root
  const fromSrc = path.resolve(__dirname, '../../../dist/frontend');
  const fromDist = path.resolve(__dirname, '../../dist/frontend');

  // Try source-relative first (dev), then dist-relative (installed)
  try {
    readFileSync(path.join(fromSrc, 'index.html'));
    return fromSrc;
  } catch {
    return fromDist;
  }
}

export function startServer(config: VibeCodingConfig) {
  setAgentCwd(config.cwd);
  setCustomSystemPrompt(config.systemPrompt);

  const app = new Hono();
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  const previewUrl = config.preview?.url ?? null;
  const wsHandlers = createWSHandlers(previewUrl);

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // WebSocket endpoint
  app.get(
    '/ws',
    upgradeWebSocket(() => ({
      onOpen(event, ws) {
        wsHandlers.onOpen(event, ws);
      },
      onMessage(event, ws) {
        wsHandlers.onMessage(event, ws);
      },
      onClose() {
        wsHandlers.onClose();
      },
    })),
  );

  // Serve pre-built frontend static files
  const staticDir = resolveStaticDir();

  app.get('/assets/*', async (c) => {
    const filePath = path.join(staticDir, c.req.path);
    try {
      const content = readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType =
        ext === '.js'
          ? 'application/javascript'
          : ext === '.css'
            ? 'text/css'
            : 'application/octet-stream';
      return c.body(content, 200, { 'Content-Type': contentType });
    } catch {
      return c.notFound();
    }
  });

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (c) => {
    try {
      const html = readFileSync(path.join(staticDir, 'index.html'), 'utf-8');
      return c.html(html);
    } catch {
      return c.text('Frontend not built. Run: pnpm build', 500);
    }
  });

  const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
    console.log(`\n  vibe-coding-ui is running!`);
    console.log(`  UI:  http://localhost:${info.port}`);
    console.log(`  CWD: ${config.cwd}\n`);
  });

  injectWebSocket(server);

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    process.exit(0);
  });

  return server;
}
