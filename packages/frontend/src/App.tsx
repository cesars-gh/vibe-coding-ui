import ChatPanel from './components/ChatPanel';
import PreviewPanel from './components/PreviewPanel';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const {
    messages,
    isConnected,
    isAgentRunning,
    astroStatus,
    sendPrompt,
    cancel,
  } = useWebSocket();

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        height: '100vh',
        width: '100vw',
      }}
    >
      <ChatPanel
        messages={messages}
        isConnected={isConnected}
        isAgentRunning={isAgentRunning}
        onSend={sendPrompt}
        onCancel={cancel}
      />
      <PreviewPanel astroStatus={astroStatus} />
    </div>
  );
}
