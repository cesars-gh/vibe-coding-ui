import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import type { WSContext, WSMessageReceive } from 'hono/ws';
import { type AgentSession, createSession, runAgent } from './agent.js';
import { ClientMessageSchema, type ServerMessage } from './types.js';

const session: AgentSession = createSession();

function send(ws: WSContext, msg: ServerMessage) {
  ws.send(JSON.stringify(msg));
}

function handleAssistantMessage(ws: WSContext, message: SDKMessage) {
  if (message.type === 'system' && 'session_id' in message) {
    send(ws, {
      type: 'session_start',
      sessionId: message.session_id as string,
    });
    return;
  }

  if (message.type === 'assistant') {
    const apiMessage = message.message as {
      content: Array<{
        type: string;
        text?: string;
        name?: string;
        input?: unknown;
      }>;
    };
    for (const block of apiMessage.content) {
      if (block.type === 'text' && block.text) {
        send(ws, { type: 'assistant_text', text: block.text });
      }
      if (block.type === 'tool_use') {
        send(ws, {
          type: 'tool_use',
          toolName: block.name ?? 'unknown',
          toolInput: block.input,
        });
      }
    }
    return;
  }

  if (message.type === 'user') {
    const apiMessage = message.message as {
      content: Array<{
        type: string;
        content?: string | Array<{ type: string; text?: string }>;
      }>;
    };
    for (const block of apiMessage.content) {
      if (block.type === 'tool_result') {
        const content = block.content;
        let output = '';
        if (typeof content === 'string') {
          output = content;
        } else if (Array.isArray(content)) {
          output = content
            .filter(
              (c): c is { type: string; text: string } =>
                c.type === 'text' && typeof c.text === 'string',
            )
            .map((c) => c.text)
            .join('\n');
        }
        send(ws, { type: 'tool_result', toolName: '', output });
      }
    }
    return;
  }

  if (message.type === 'stream_event') {
    const event = (
      message as {
        event: { type: string; delta?: { type: string; text?: string } };
      }
    ).event;
    if (
      event.type === 'content_block_delta' &&
      event.delta?.type === 'text_delta' &&
      event.delta.text
    ) {
      send(ws, {
        type: 'assistant_text',
        text: event.delta.text,
        delta: event.delta.text,
      });
    }
    return;
  }

  if (message.type === 'result') {
    const resultMsg = message as {
      subtype: string;
      result?: string;
      total_cost_usd?: number;
      duration_ms?: number;
      errors?: string[];
    };
    if (resultMsg.subtype === 'success') {
      send(ws, {
        type: 'result',
        text: resultMsg.result ?? '',
        costUsd: resultMsg.total_cost_usd,
        durationMs: resultMsg.duration_ms,
      });
    } else {
      send(ws, {
        type: 'error',
        message: resultMsg.errors?.join(', ') ?? 'Agent error',
      });
    }
    return;
  }
}

async function handlePrompt(ws: WSContext, message: string) {
  if (session.isRunning) {
    send(ws, {
      type: 'error',
      message: 'Agent is busy. Send a cancel message first.',
    });
    return;
  }

  try {
    for await (const sdkMessage of runAgent(message, session)) {
      handleAssistantMessage(ws, sdkMessage);
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      send(ws, { type: 'result', text: 'Cancelled by user.' });
    } else {
      send(ws, { type: 'error', message: (err as Error).message });
    }
  }
}

export function createWSHandlers() {
  return {
    onOpen(_event: Event, _ws: WSContext) {
      console.log('[ws] client connected');
    },
    onMessage(event: MessageEvent<WSMessageReceive>, ws: WSContext) {
      let data: unknown;
      try {
        data = JSON.parse(String(event.data));
      } catch {
        send(ws, { type: 'error', message: 'Invalid JSON' });
        return;
      }

      const parsed = ClientMessageSchema.safeParse(data);
      if (!parsed.success) {
        send(ws, { type: 'error', message: 'Invalid message format' });
        return;
      }

      const msg = parsed.data;

      if (msg.type === 'prompt') {
        handlePrompt(ws, msg.message);
      } else if (msg.type === 'cancel') {
        if (session.isRunning) {
          session.abortController.abort();
        }
      }
    },
    onClose() {
      console.log('[ws] client disconnected');
    },
  };
}
