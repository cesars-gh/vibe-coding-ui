import type { Message } from '../hooks/useWebSocket';

interface MessageItemProps {
  message: Message;
}

const roleStyles: Record<string, React.CSSProperties> = {
  user: {
    background: 'var(--user-bg)',
    borderLeft: '3px solid var(--accent)',
  },
  assistant: {
    background: 'var(--assistant-bg)',
    borderLeft: '3px solid #666',
  },
  tool: {
    background: 'var(--tool-bg)',
    borderLeft: '3px solid #a16207',
    fontSize: '12px',
    fontFamily: 'ui-monospace, monospace',
  },
  error: {
    background: '#1f1015',
    borderLeft: '3px solid var(--error)',
  },
  system: {
    background: 'transparent',
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
    padding: '4px 16px',
  },
};

export default function MessageItem({ message }: MessageItemProps) {
  const style = roleStyles[message.role] ?? roleStyles.assistant;

  return (
    <div
      style={{
        padding: message.role === 'system' ? '4px 16px' : '10px 16px',
        ...style,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
      }}
    >
      {message.role !== 'system' && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: '4px',
            letterSpacing: '0.5px',
          }}
        >
          {message.role === 'tool' && message.toolName
            ? message.toolName
            : message.role}
        </div>
      )}
      <div>{message.content}</div>
    </div>
  );
}
