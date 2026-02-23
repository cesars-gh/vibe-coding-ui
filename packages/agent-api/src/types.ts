import { z } from 'zod';

// Client → Server messages
export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('prompt'),
    message: z.string(),
    sessionId: z.string().optional(),
  }),
  z.object({
    type: z.literal('cancel'),
    sessionId: z.string().optional(),
  }),
]);

export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// Server → Client messages
export type ServerMessage =
  | { type: 'session_start'; sessionId: string }
  | { type: 'assistant_text'; text: string; delta?: string }
  | { type: 'tool_use'; toolName: string; toolInput: unknown }
  | { type: 'tool_result'; toolName: string; output: string }
  | { type: 'result'; text: string; costUsd?: number; durationMs?: number }
  | {
      type: 'astro_status';
      status: 'starting' | 'ready' | 'error';
      message?: string;
    }
  | { type: 'error'; message: string };
