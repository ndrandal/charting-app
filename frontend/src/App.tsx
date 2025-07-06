// frontend/src/App.tsx

import React, { useState, useEffect } from 'react'
import ChartCanvas from './components/ChartCanvas'

type SeriesType = 'line' | 'candlestick'

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seriesType, setSeriesType] = useState<SeriesType>('line')
  const [seriesTypes, setSeriesTypes] = useState<SeriesType[]>(['line'])

  const [connected, setConnected] = useState(false)
  // we can derive streaming = connected && seriesTypes.length>0
  const streaming = connected && seriesTypes.length > 0

  useEffect(() => {
    const url = process.env.REACT_APP_WS_URL ?? 'ws://localhost:9001'
    const socket = new WebSocket(url)

    socket.onopen = () => {
      setConnected(true)
      setError(null)
      // no subscribe here — we’ll handle it in the next effect
    }

    socket.onclose = () => {
      setConnected(false)
      setError('WebSocket closed')
    }

    socket.onerror = () => {
      setError('WebSocket error')
    }

    setWs(socket)
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'unsubscribe' }))
      }
      socket.close()
    }
  }, [])  // reconnect & resubscribe whenever seriesType changes


  useEffect(() => {
    if (ws && connected) {
      // first unsubscribe from the old set
      ws.send(JSON.stringify({ type: 'unsubscribe' }))
      // then subscribe to the new array
      ws.send(JSON.stringify({
        type: 'subscribe',
        seriesTypes
      }))
    }
  }, [seriesTypes, ws, connected])

  const handleSeriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSeriesType(e.target.value as SeriesType)
    // The effect above will handle sending unsubscribe + new subscribe
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Charting App</h1>

      <div style={{ marginBottom: 12 }}>
        <label>
          Chart type:&nbsp;
          <div style={{ marginBottom: 12 }}>
            <label>
              <input
                type="checkbox"
                value="line"
                checked={seriesTypes.includes('line')}
                onChange={e => {
                  const checked = e.target.checked;
                  setSeriesTypes(prev =>
                    checked
                      ? [...prev, 'line']
                      : prev.filter(s => s !== 'line')
                  );
                }}
              />{' '}
              Line
            </label>
            {' '}
            <label>
              <input
                type="checkbox"
                value="candlestick"
                checked={seriesTypes.includes('candlestick')}
                onChange={e => {
                  const checked = e.target.checked;
                  setSeriesTypes(prev =>
                    checked
                      ? [...prev, 'candlestick']
                      : prev.filter(s => s !== 'candlestick')
                  );
                }}
              />{' '}
              Candlestick
            </label>
          </div>
        </label>
      </div>

      {!connected && <p>Connecting to {process.env.REACT_APP_WS_URL}…</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {/* Only render the canvas when we have a live WebSocket */}
      {ws && connected && (
        <ChartCanvas ws={ws} streaming={streaming} />
      )}
    </div>
  )
}

export default App
