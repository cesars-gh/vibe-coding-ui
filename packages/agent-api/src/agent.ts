import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { query } from '@anthropic-ai/claude-agent-sdk';

let AGENT_CWD: string;
let CUSTOM_SYSTEM_PROMPT: string | undefined;

export function setAgentCwd(dir: string) {
  AGENT_CWD = dir;
}

export function setCustomSystemPrompt(prompt: string | undefined) {
  CUSTOM_SYSTEM_PROMPT = prompt;
}

const DEFAULT_SYSTEM_APPEND = `
You are working on a software project. The project is already set up at the current working directory.

Always write clean, well-structured code.
When creating or modifying files, follow existing patterns and conventions in the codebase.
You can use git to commit and push your changes.
Always commit with meaningful messages.
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
        cwd: AGENT_CWD,
        permissionMode: 'acceptEdits',
        allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash'],
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: CUSTOM_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_APPEND,
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
