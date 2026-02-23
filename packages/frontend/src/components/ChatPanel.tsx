import type { Message } from '../hooks/useWebSocket';
import ChatInput from './ChatInput';
import MessageList from './MessageList';

interface ChatPanelProps {
  messages: Message[];
  isConnected: boolean;
  isAgentRunning: boolean;
  onSend: (text: string) => void;
  onCancel: () => void;
}

export default function ChatPanel({
  messages,
  isConnected,
  isAgentRunning,
  onSend,
  onCancel,
}: ChatPanelProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 600 }}>Vibe Coding</span>
        <span
          style={{
            fontSize: '12px',
            color: isConnected ? 'var(--success)' : 'var(--error)',
          }}
        >
          {isConnected ? 'Connected' : 'Disconnected'}
          {isAgentRunning && ' — Working...'}
        </span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <MessageList messages={messages} />
      </div>
      <ChatInput
        onSend={onSend}
        onCancel={onCancel}
        isAgentRunning={isAgentRunning}
        isConnected={isConnected}
      />
    </div>
  );
}
