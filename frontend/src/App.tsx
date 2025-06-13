import React, { useState, useEffect, useRef, useCallback } from 'react';
import StreamControls from './components/StreamControls';
import ChartCanvas from './components/ChartCanvas';
import type { ClientToServer } from './types/protocol';

const WS_URL = 'ws://localhost:9001';

const App: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [seriesType, setSeriesType] = useState<'line' | 'candlestick'>('line');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  const subscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientToServer = { type: 'subscribe', seriesType };
      wsRef.current.send(JSON.stringify(msg));
      setStreaming(true);
    }
  }, [seriesType]);

  const unsubscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const msg: ClientToServer = { type: 'unsubscribe' };
      wsRef.current.send(JSON.stringify(msg));
      setStreaming(false);
    }
  }, []);

  if (!isConnected) return <div>Connecting…</div>;

  return (
    <>
      <StreamControls
        seriesType={seriesType}
        onSeriesTypeChange={setSeriesType}
        onSubscribe={subscribe}
        onUnsubscribe={unsubscribe}
        streaming={streaming}
      />
      <ChartCanvas ws={wsRef.current!} streaming={streaming} />
    </>
  );
};

export default App;