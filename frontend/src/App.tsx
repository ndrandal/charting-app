// frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import ChartCanvas, { DataPoint } from './components/ChartCanvas';

// Supported series types
type SeriesType = 'line' | 'candlestick';

const WS_URL = process.env.REACT_APP_WS_URL ?? 'ws://localhost:9001';

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Allow user to choose which series types to request
  const [seriesTypes, setSeriesTypes] = useState<SeriesType[]>(['line']);

  // Data for ChartCanvas (only first series used)
  const [data, setData] = useState<DataPoint[]>([]);

  // Establish WebSocket connection once
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      setConnected(true);
      setError(null);
    };
    socket.onclose = () => {
      setConnected(false);
      setError('WebSocket closed');
    };
    socket.onerror = () => setError('WebSocket error');
    setWs(socket);
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'unsubscribe' }));
      }
      socket.close();
    };
  }, []);

  // Subscribe/unsubscribe and handle incoming messages
  useEffect(() => {
    if (!ws || !connected) return;
    // Clean up prior handler
    ws.onmessage = null;

    // Subscribe to selected series types
    ws.send(JSON.stringify({ type: 'unsubscribe' }));
    ws.send(
      JSON.stringify({ type: 'subscribe', seriesTypes })
    );

    // Handle incoming drawCommands
    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'drawCommands' && Array.isArray(msg.commands)) {
          // Convert all commands' vertices into DataPoint[]
          const pts: DataPoint[] = [];
          msg.commands.forEach((cmd: any) => {
            if (Array.isArray(cmd.vertices)) {
              for (let i = 0; i < cmd.vertices.length; i += 2) {
                const x = cmd.vertices[i];
                const y = cmd.vertices[i+1];
                pts.push({ x, y });
              }
            }
          });
          setData(pts);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    // Cleanup on seriesTypes change or unmount
    return () => {
      ws.send(JSON.stringify({ type: 'unsubscribe' }));
      ws.onmessage = null;
    };
  }, [ws, connected, seriesTypes]);

  // Toggle checkboxes
  const toggleSeries = (type: SeriesType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSeriesTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Charting App</h1>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Series:</label>
        <label style={{ marginRight: 8 }}>
          <input
            type="checkbox"
            checked={seriesTypes.includes('line')}
            onChange={toggleSeries('line')}
          />{' '}
          Line
        </label>
        <label>
          <input
            type="checkbox"
            checked={seriesTypes.includes('candlestick')}
            onChange={toggleSeries('candlestick')}
          />{' '}
          Candlestick
        </label>
      </div>

      {!connected && <p>Connecting to {WS_URL}…</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {connected && (
        <ChartCanvas
          width={800}
          height={400}
          data={data}
          title={seriesTypes.join(', ').toUpperCase()}
          xLabel="X"
          yLabel="Y"
          smooth={true}
          smoothSegments={5}
        />
      )}
    </div>
  );
};

export default App;
