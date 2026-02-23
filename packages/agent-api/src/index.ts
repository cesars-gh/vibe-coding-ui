import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createAstroServer } from './astro-server.js';
import { createWSHandlers } from './ws-handler.js';

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use('*', cors());

app.get('/health', (c) => c.json({ status: 'ok' }));

const wsHandlers = createWSHandlers();

app.get(
  '/ws',
  upgradeWebSocket(() => ({
    onOpen(event, ws) {
      wsHandlers.onOpen(event, ws);
      const status = astroServer.isReady() ? 'ready' : 'starting';
      ws.send(JSON.stringify({ type: 'astro_status', status }));
    },
    onMessage(event, ws) {
      wsHandlers.onMessage(event, ws);
    },
    onClose() {
      wsHandlers.onClose();
    },
  })),
);

const astroServer = createAstroServer();

const PORT = 3000;

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Agent API listening on http://localhost:${info.port}`);
});

injectWebSocket(server);

// Start Astro dev server
console.log('Starting Astro dev server...');
astroServer
  .start()
  .then(() => {
    console.log('Astro dev server is ready on http://localhost:4321');
  })
  .catch((err) => {
    console.error('Failed to start Astro dev server:', err);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await astroServer.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await astroServer.stop();
  process.exit(0);
});
