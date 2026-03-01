# Vibe Coding UI

[![npm version](https://img.shields.io/npm/v/vibe-coding-ui)](https://www.npmjs.com/package/vibe-coding-ui)
[![npm downloads](https://img.shields.io/npm/dm/vibe-coding-ui)](https://www.npmjs.com/package/vibe-coding-ui)
![TypeScript](https://img.shields.io/badge/TypeScript-ready-2f74c0?logo=typescript)
![pnpm](https://img.shields.io/badge/pnpm-compatible-f69220?logo=pnpm)
![Server](https://img.shields.io/badge/Server-Hono-orange)

Your project’s friendly, browser-based Claude Code UI. Install it in any repo and talk to an agent that can read, edit, and build right from your codebase — with a clean split‑view chat + live preview.

## Quick Start

1) Install globally:

```sh
npm i -g vibe-coding-ui
```

2) Set your Anthropic API key (required):

```sh
export ANTHROPIC_API_KEY=your_key_here
# or add it to a .env in your project
```

3) Run the UI server from your project directory (defaults to port 8000):

```sh
cd your-project && vibe-coding-ui start
# optional: vibe-coding-ui start --port 3001
```

4) Open the app: http://localhost:8000

Type what you want to build, watch streaming responses, cancel when needed, and see cost + duration as the agent completes tasks.

## Why Vibe Coding?

Skip juggling terminals and tabs — get a smooth, focused coding flow.

- Browser-native comfort: connect from anywhere, even a tablet.
- Split-view productivity: chat on the left, live preview on the right.
- Clear progress: streaming tokens, visible tool usage, cancel button, and cost/time summary.
- Local power: the agent runs against your real codebase and environment.
- Bring your own key: no Claude subscription needed — just `ANTHROPIC_API_KEY`.

### Vibe Coding vs Claude Code (CLI)

- Runs remotely in a browser — no terminal tether required.
- Friendly UI with streaming, cost/time, and tool logs.
- Live preview panel for web apps (optional) with a draggable split.
- Easy to share via SSH tunnel or reverse proxy for teammates.

### Vibe Coding vs Claude Code (Web)

- You control the machine, files, and tools — zero sandbox surprises.
- Persistent project context because it’s running in your repo’s working directory.
- Uses your Anthropic API key; no additional subscription linking.
- Preview any local dev server you want (Vite, Next.js, Remix, etc.).

## Configuration

Add a `.vibecoding.json` at the project root to customize preview and prompts:

```json
{
  "preview": true,
  "previewUrl": "http://localhost:5173",
  "systemPrompt": "You are working on a React app. Prefer functional components.",
  "port": 8000
}
```

- `preview` (boolean): enables the right‑side live preview panel.
- `previewUrl` (string): the base URL of your local dev server (e.g., Vite at 5173 or Next.js at 3000).
- `systemPrompt` (string): optional extra guidance appended to the Claude Code system prompt.
- `port` (number): port for the UI server. Can also be set via `--port`.

Tip: With preview enabled, you can navigate inside the iframe (e.g., `/settings`) and refresh from the toolbar.

## What the Agent Can Do

Powered by the Claude Code SDK with sensible defaults:

- Reads and edits files in your repo (cwd-scoped).
- Uses tools like Read, Write, Edit, Glob, Grep, and Bash when needed.
- Streams responses so you can follow along in real time.
- Shows tool use and results in the chat history.
- Lets you cancel long‑running actions safely.

## Troubleshooting

- Missing key: if `ANTHROPIC_API_KEY` is not set, the server will refuse to start.
- Frontend not built: if you’re hacking locally and see "Frontend not built", run `pnpm build` from the repo.
- Web preview not showing: ensure your app is running at `previewUrl` and that CORS/content security isn’t blocking the iframe.

## FAQ

- Is this only for web apps? No — the agent works for any repo. The preview panel is optional and handy for web projects.
- Can it break my files? It can edit files like any coding agent. Use version control; commit often; review diffs.
- Can I resume a session? The UI keeps a live session while connected. Restarting the server starts a fresh session.

