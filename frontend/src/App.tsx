import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './ThemeProvider';
import ResizableChart, { DataPoint } from './components/ResizableChart';
import ChartSubscriber from './components/ChartSubscriber';


// Supported series types
type SeriesType = 'line' | 'candlestick';

const WS_URL = process.env.REACT_APP_WS_URL ?? 'ws://localhost:9001';

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Allow user to choose which series types to request
  const [seriesTypes, setSeriesTypes] = useState<SeriesType[]>(['line']);
  const [data, setData] = useState<DataPoint[]>([]);

  type ChartSlot = { id: SeriesType };
  const chartSlots: ChartSlot[] = seriesTypes.map(type => ({ id: type }));

  // WebSocket lifecycle
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen = () => { setConnected(true); setError(null); };
    socket.onclose = () => { setConnected(false); setError('WebSocket closed'); };
    socket.onerror = () => setError('WebSocket error');
    setWs(socket);
    return () => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'unsubscribe' }));
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (!ws || !connected) return;
    ws.onmessage = null;
    ws.send(JSON.stringify({ type: 'unsubscribe' }));
    ws.send(JSON.stringify({ type: 'subscribe', seriesTypes }));
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'drawCommands' && Array.isArray(msg.commands)) {
          const pts: DataPoint[] = [];
          msg.commands.forEach((cmd: any) => {
            if (Array.isArray(cmd.vertices)) {
              for (let i = 0; i < cmd.vertices.length; i += 2) {
                pts.push({ x: cmd.vertices[i], y: cmd.vertices[i + 1] });
              }
            }
          });
          setData(pts);
        }
      } catch (e) {
        console.error(e);
      }
    };
    return () => {
      ws.send(JSON.stringify({ type: 'unsubscribe' }));
      ws.onmessage = null;
    };
  }, [ws, connected, seriesTypes]);

  const toggleSeries = (type: SeriesType) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeriesTypes(prev =>
      e.target.checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  return (
  <ThemeProvider>
    <div
      style={{
        padding: 20,
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        gap: 12,
      }}
    >
      <h1>Charting App</h1>

      {/* series checkboxes */}
      <div>
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

      {/* error or connecting status */}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {!connected && <p>Connecting to {WS_URL}&hellip;</p>}

      {/* multi‐chart grid */}
      {connected && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '12px',
            flexGrow: 1,
            minHeight: 0,
          }}
        >
          {chartSlots.map((slot) => (
            <ResizableChart
              key={slot.id}
              data={data}
              title={slot.id.toUpperCase()}
              xLabel="Time"
              yLabel="Price"
              margin={{ top: 30, right: 40, bottom: 40, left: 40 }}
              smooth={false}
              smoothSegments={5}
            />
          ))}
        </div>
      )}
    </div>
  </ThemeProvider>
);
};

export default App;
