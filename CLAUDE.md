# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack "vibe coding" playground where users chat with a Claude agent via a React frontend, and the agent creates/modifies an Astro website in real-time with live preview. Three packages in a pnpm monorepo.

## Commands

```bash
# Development
pnpm dev:all          # Run agent-api + frontend together
pnpm dev              # Agent-API only (port 3000)
pnpm dev:frontend     # Frontend only (port 5173)
pnpm dev:website      # Astro website only (port 4321)

# Code quality (Biome)
pnpm lint             # Check
pnpm lint:fix         # Auto-fix
pnpm format           # Format

# Build individual packages
pnpm --filter agent-api build
pnpm --filter frontend build
pnpm --filter website build
```

## Architecture

**Monorepo** (`pnpm-workspace.yaml`) with three packages:

- **`packages/agent-api`** — Hono HTTP/WebSocket server (port 3000). Receives chat messages over WebSocket, forwards them to the Claude Agent SDK, and streams responses back. Also spawns and manages the Astro dev server as a child process (`astro-server.ts`).

- **`packages/frontend`** — React 19 + Vite chat UI (port 5173). Two-panel layout: `ChatPanel` (left) for conversation, `PreviewPanel` (right) with an iframe showing the live Astro site. WebSocket connection with auto-reconnect in `useWebSocket.ts`.

- **`packages/website`** — Astro 5 site (port 4321). This is the project the Claude agent edits. Pages live in `src/pages/`, layouts in `src/layouts/`. Changes auto-reload via HMR.

**Data flow:** Frontend → WebSocket → agent-api → Claude Agent SDK → reads/writes files in `packages/website/` → Astro HMR updates iframe preview.

## Key Files

- `packages/agent-api/src/agent.ts` — Claude Agent SDK integration, system prompt, session management
- `packages/agent-api/src/ws-handler.ts` — WebSocket message protocol (prompt, cancel, streaming responses)
- `packages/agent-api/src/types.ts` — Shared message type definitions
- `packages/frontend/src/hooks/useWebSocket.ts` — WebSocket hook with reconnect logic

## Code Style

- **Biome** for linting and formatting (not ESLint/Prettier)
- Single quotes, 2-space indentation
- TypeScript strict mode everywhere
- Zod for runtime validation in agent-api

## Environment

- Requires `ANTHROPIC_API_KEY` in root `.env` (see `.env.example`)
