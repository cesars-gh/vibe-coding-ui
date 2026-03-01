import { useCallback, useRef, useState } from 'react';

interface PreviewPanelProps {
  previewUrl: string;
  chatVisible: boolean;
  onToggleChat: () => void;
}

export default function PreviewPanel({
  previewUrl,
  chatVisible,
  onToggleChat,
}: PreviewPanelProps) {
  const [activePath, setActivePath] = useState('/');
  const [inputValue, setInputValue] = useState('/');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigateTo = useCallback(
    (newPath: string) => {
      const normalized = newPath.startsWith('/') ? newPath : `/${newPath}`;
      setActivePath(normalized);
      setInputValue(normalized);
      if (iframeRef.current) {
        iframeRef.current.src = `${previewUrl}${normalized}`;
      }
    },
    [previewUrl],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigateTo(inputValue);
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = `${previewUrl}${activePath}`;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={onToggleChat}
            title={chatVisible ? 'Hide chat' : 'Show chat'}
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 6px',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {chatVisible ? '\u00AB' : '\u00BB'}
          </button>
          <span style={{ fontWeight: 600 }}>Preview</span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--success)' }}>Live</span>
      </div>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={handleRefresh}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 6px',
            borderRadius: 'var(--radius)',
          }}
          title="Refresh"
        >
          &#x21bb;
        </button>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            color: 'var(--text)',
            padding: '6px 10px',
            fontSize: '13px',
            fontFamily: 'monospace',
            outline: 'none',
          }}
          placeholder="/"
        />
        <button
          type="button"
          onClick={() => navigateTo(inputValue)}
          style={{
            background: 'var(--accent)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '6px 12px',
            borderRadius: 'var(--radius)',
          }}
        >
          Go
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src={`${previewUrl}${activePath}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white',
          }}
          title="Preview"
        />
      </div>
    </div>
  );
}
