import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig } from './config.js';
import { startServer } from './index.js';

// Resolve to the monorepo root (two levels up from packages/agent-api/src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

const config = resolveConfig({ cwd: rootDir, port: 3000 });
startServer(config);
