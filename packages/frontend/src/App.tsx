import { useCallback, useEffect, useState } from 'react';
import ChatPanel from './components/ChatPanel';
import PreviewPanel from './components/PreviewPanel';
import { useWebSocket } from './hooks/useWebSocket';

const MIN_CHAT_WIDTH = 500;
const MIN_PREVIEW_WIDTH = 200;

export default function App() {
  const {
    messages,
    isConnected,
    isAgentRunning,
    previewUrl,
    sendPrompt,
    cancel,
  } = useWebSocket();

  const hasPreview = !!previewUrl;

  const [chatWidth, setChatWidth] = useState(() =>
    Math.max(window.innerWidth / 2, MIN_CHAT_WIDTH),
  );
  const [chatVisible, setChatVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const clamped = Math.max(
        MIN_CHAT_WIDTH,
        Math.min(e.clientX, window.innerWidth - MIN_PREVIEW_WIDTH),
      );
      setChatWidth(clamped);
    };

    const handleMouseUp = () => setIsDragging(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // No preview — chat takes full width
  if (!hasPreview) {
    return (
      <div style={{ height: '100vh', width: '100vw' }}>
        <ChatPanel
          messages={messages}
          isConnected={isConnected}
          isAgentRunning={isAgentRunning}
          onSend={sendPrompt}
          onCancel={cancel}
        />
      </div>
    );
  }

  // Split layout with preview
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {chatVisible && (
        <div
          style={{ width: chatWidth, minWidth: MIN_CHAT_WIDTH, flexShrink: 0 }}
        >
          <ChatPanel
            messages={messages}
            isConnected={isConnected}
            isAgentRunning={isAgentRunning}
            onSend={sendPrompt}
            onCancel={cancel}
          />
        </div>
      )}

      {chatVisible && (
        <hr
          aria-valuenow={chatWidth}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => {
            if (!isDragging) e.currentTarget.style.background = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            if (!isDragging) e.currentTarget.style.background = 'var(--border)';
          }}
          style={{
            width: 6,
            cursor: 'col-resize',
            background: isDragging ? 'var(--accent)' : 'var(--border)',
            flexShrink: 0,
            transition: isDragging ? 'none' : 'background 0.15s',
            border: 'none',
            outline: 'none',
          }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {isDragging && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} />
        )}
        <PreviewPanel
          previewUrl={previewUrl}
          chatVisible={chatVisible}
          onToggleChat={() => setChatVisible((v) => !v)}
        />
      </div>
    </div>
  );
}
