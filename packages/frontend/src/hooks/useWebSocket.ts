import { useCallback, useEffect, useRef, useState } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'error' | 'system';
  content: string;
  toolName?: string;
  timestamp: number;
}

interface AstroStatus {
  status: 'starting' | 'ready' | 'error';
  message?: string;
}

const WS_URL =
  import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3000/ws`;

export function useWebSocket() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [astroStatus, setAstroStatus] = useState<AstroStatus>({
    status: 'starting',
  });
  const wsRef = useRef<WebSocket | null>(null);
  const currentAssistantRef = useRef<string>('');
  const currentAssistantIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[ws] connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsAgentRunning(false);
      console.log('[ws] disconnected');
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'session_start':
          setIsAgentRunning(true);
          currentAssistantRef.current = '';
          currentAssistantIdRef.current = null;
          break;

        case 'assistant_text': {
          if (msg.delta) {
            // Streaming delta
            if (!currentAssistantIdRef.current) {
              const id = crypto.randomUUID();
              currentAssistantIdRef.current = id;
              currentAssistantRef.current = msg.delta;
              setMessages((prev) => [
                ...prev,
                {
                  id,
                  role: 'assistant',
                  content: msg.delta,
                  timestamp: Date.now(),
                },
              ]);
            } else {
              currentAssistantRef.current += msg.delta;
              const text = currentAssistantRef.current;
              const id = currentAssistantIdRef.current;
              setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, content: text } : m)),
              );
            }
          } else {
            // Full text block (non-streaming)
            currentAssistantRef.current = '';
            currentAssistantIdRef.current = null;
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: msg.text,
                timestamp: Date.now(),
              },
            ]);
          }
          break;
        }

        case 'tool_use':
          currentAssistantRef.current = '';
          currentAssistantIdRef.current = null;
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'tool',
              content: `Using tool: ${msg.toolName}`,
              toolName: msg.toolName,
              timestamp: Date.now(),
            },
          ]);
          break;

        case 'tool_result':
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'tool',
              content: msg.output ? msg.output.slice(0, 500) : '(done)',
              timestamp: Date.now(),
            },
          ]);
          break;

        case 'result':
          setIsAgentRunning(false);
          currentAssistantRef.current = '';
          currentAssistantIdRef.current = null;
          if (msg.costUsd) {
            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: 'system',
                content: `Done (${msg.durationMs ? `${(msg.durationMs / 1000).toFixed(1)}s` : ''}, $${msg.costUsd?.toFixed(4) ?? '?'})`,
                timestamp: Date.now(),
              },
            ]);
          }
          break;

        case 'astro_status':
          setAstroStatus({ status: msg.status, message: msg.message });
          break;

        case 'error':
          setIsAgentRunning(false);
          currentAssistantRef.current = '';
          currentAssistantIdRef.current = null;
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: 'error',
              content: msg.message,
              timestamp: Date.now(),
            },
          ]);
          break;
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const sendPrompt = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      },
    ]);

    wsRef.current.send(JSON.stringify({ type: 'prompt', message: text }));
    setIsAgentRunning(true);
  }, []);

  const cancel = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'cancel' }));
  }, []);

  return {
    messages,
    isConnected,
    isAgentRunning,
    astroStatus,
    sendPrompt,
    cancel,
  };
}
