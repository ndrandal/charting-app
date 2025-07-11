// src/components/ChartSubscriber.tsx
import React, { useState, useEffect, useRef } from 'react';
import ResizableChart from './ResizableChart';
import { DataPoint } from './ResizableChart';

type SeriesType = 'line' | 'candlestick';
const WS_URL = process.env.REACT_APP_WS_URL ?? 'ws://localhost:9001';

interface ChartSubscriberProps {
  seriesType: SeriesType;
}

const ChartSubscriber: React.FC<ChartSubscriberProps> = ({ seriesType }) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // track the latest animation frame id
  const rafRef = useRef<number | null>(null);

  // Open one WebSocket per subscriber
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    socket.onopen   = () => { setConnected(true); setError(null); };
    socket.onclose  = () => { setConnected(false); setError('WebSocket closed'); };
    socket.onerror  = () => setError('WebSocket error');
    setWs(socket);
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'unsubscribe' }));
      }
      socket.close();
    };
  }, []);

  // Subscribe & handle messages with addEventListener + RAF throttle
  useEffect(() => {
    if (!ws || !connected) return;

    // our message handler
    const onMessage = (ev: MessageEvent) => {
      let pts: DataPoint[] = [];
      try {
        const msg = JSON.parse(ev.data);
        // ignore messages for other series (if the protocol tags them)
        if (msg.seriesType && msg.seriesType !== seriesType) return;
        if (msg.type === 'drawCommands' && Array.isArray(msg.commands)) {
          msg.commands.forEach((cmd: any) => {
            if (Array.isArray(cmd.vertices)) {
              for (let i = 0; i < cmd.vertices.length; i += 2) {
                pts.push({ x: cmd.vertices[i], y: cmd.vertices[i + 1] });
              }
            }
          });
        }
      } catch {
        return; // on parse error just ignore
      }

      // throttle state updates to once per frame
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setData(pts);
        rafRef.current = null;
      });
    };

    // make sure we’re unsubscribed, then subscribe this seriesType
    ws.send(JSON.stringify({ type: 'unsubscribe' }));
    ws.send(JSON.stringify({ type: 'subscribe', seriesTypes: [seriesType] }));
    ws.addEventListener('message', onMessage);

    return () => {
      ws.send(JSON.stringify({ type: 'unsubscribe' }));
      ws.removeEventListener('message', onMessage);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [ws, connected, seriesType]);

  if (error)      return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!connected) return <div>Connecting to {WS_URL}&hellip;</div>;

  return (
    <ResizableChart
      data={data}
      title={seriesType.toUpperCase()}
      xLabel="Time"
      yLabel="Price"
      margin={{ top: 30, right: 40, bottom: 40, left: 40 }}
      smooth={false}
      smoothSegments={5}
    />
  );
};

export default ChartSubscriber;
