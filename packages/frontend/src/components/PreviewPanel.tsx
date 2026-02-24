import { useCallback, useRef, useState } from 'react';

interface PreviewPanelProps {
  astroStatus: { status: string; message?: string };
  chatVisible: boolean;
  onToggleChat: () => void;
}

const ASTRO_ORIGIN =
  import.meta.env.VITE_ASTRO_ORIGIN ||
  `http://${window.location.hostname}:4321`;

export default function PreviewPanel({
  astroStatus,
  chatVisible,
  onToggleChat,
}: PreviewPanelProps) {
  const isReady = astroStatus.status === 'ready';
  const [activePath, setActivePath] = useState('/');
  const [inputValue, setInputValue] = useState('/');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigateTo = useCallback((newPath: string) => {
    const normalized = newPath.startsWith('/') ? newPath : `/${newPath}`;
    setActivePath(normalized);
    setInputValue(normalized);
    if (iframeRef.current) {
      iframeRef.current.src = `${ASTRO_ORIGIN}${normalized}`;
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      navigateTo(inputValue);
    }
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = `${ASTRO_ORIGIN}${activePath}`;
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
        <span
          style={{
            fontSize: '12px',
            color: isReady ? 'var(--success)' : 'var(--text-muted)',
          }}
        >
          {astroStatus.status === 'starting' && 'Astro starting...'}
          {astroStatus.status === 'ready' && 'Live'}
          {astroStatus.status === 'error' &&
            `Error: ${astroStatus.message ?? 'unknown'}`}
        </span>
      </div>
      {isReady && (
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
      )}
      <div style={{ flex: 1, position: 'relative' }}>
        {isReady ? (
          <iframe
            ref={iframeRef}
            src={`${ASTRO_ORIGIN}${activePath}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'white',
            }}
            title="Astro Preview"
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
            }}
          >
            Waiting for Astro dev server...
          </div>
        )}
      </div>
    </div>
  );
}
