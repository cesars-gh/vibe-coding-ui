import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';

let WEBSITE_CWD: string;

export function setWebsiteCwd(dir: string) {
  WEBSITE_CWD = dir;
}

const SYSTEM_APPEND = `
You are building an Astro website. The project is already set up at the current working directory.

Key conventions:
- Pages go in src/pages/ (each .astro file = a route)
- Layouts go in src/layouts/ (Layout.astro is the base HTML shell)
- Components go in src/components/
- Static assets go in public/
- The dev server has HMR, so changes appear instantly in the browser preview

Always write clean, well-structured Astro code. Prefer scoped styles in <style> tags.
When creating new pages, import and use the Layout component.

You can use git to commit and push your changes.
Always commit with meaningful messages.
The project is a git repo with a remote you can push to.
`;

export interface AgentSession {
  sessionId: string | undefined;
  abortController: AbortController;
  isRunning: boolean;
}

export function createSession(): AgentSession {
  return {
    sessionId: undefined,
    abortController: new AbortController(),
    isRunning: false,
  };
}

export async function* runAgent(
  prompt: string,
  session: AgentSession,
): AsyncGenerator<SDKMessage> {
  session.abortController = new AbortController();
  session.isRunning = true;

  try {
    const conversation = query({
      prompt,
      options: {
        cwd: WEBSITE_CWD,
        permissionMode: 'acceptEdits',
        allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: SYSTEM_APPEND,
        },
        settingSources: ['project'],
        includePartialMessages: true,
        abortController: session.abortController,
        ...(session.sessionId ? { resume: session.sessionId } : {}),
      },
    });

    for await (const message of conversation) {
      // Capture session ID from the init message
      if (message.type === 'system' && 'session_id' in message) {
        session.sessionId = message.session_id as string;
      }
      yield message;
    }
  } finally {
    session.isRunning = false;
  }
}
