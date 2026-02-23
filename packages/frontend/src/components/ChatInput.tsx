import { type KeyboardEvent, useState } from 'react';

interface ChatInputProps {
  onSend: (text: string) => void;
  onCancel: () => void;
  isAgentRunning: boolean;
  isConnected: boolean;
}

export default function ChatInput({
  onSend,
  onCancel,
  isAgentRunning,
  isConnected,
}: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const text = input.trim();
    if (!text || isAgentRunning) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
      }}
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isConnected ? 'Describe what to build...' : 'Connecting...'
        }
        disabled={!isConnected}
        rows={2}
        style={{
          flex: 1,
          padding: '10px 14px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: '14px',
          fontFamily: 'inherit',
          resize: 'none',
          outline: 'none',
          lineHeight: '1.5',
        }}
      />
      {isAgentRunning ? (
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 20px',
            background: 'var(--error)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Cancel
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          disabled={!isConnected || !input.trim()}
          style={{
            padding: '10px 20px',
            background:
              input.trim() && isConnected ? 'var(--accent)' : 'var(--border)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: input.trim() && isConnected ? 'pointer' : 'default',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Send
        </button>
      )}
    </div>
  );
}
