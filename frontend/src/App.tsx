// frontend/src/App.tsx

import React, { useState, useEffect } from 'react'
import ChartCanvas from './components/ChartCanvas'

type SeriesType = 'line' | 'candlestick'

const App: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seriesType, setSeriesType] = useState<SeriesType>('line')
  const [seriesTypes, setSeriesTypes] = useState<SeriesType[]>(['line'])

  // Establish WebSocket & handle subscribe/unsubscribe
  useEffect(() => {
    const url = process.env.REACT_APP_WS_URL ?? 'ws://localhost:9001'
    const socket = new WebSocket(url)

    socket.onopen = () => {
      setConnected(true)
      setError(null)
      // Immediately subscribe to the current seriesType
      socket.send(JSON.stringify({
        type: 'subscribe',
        seriesType
      }))
      setStreaming(true)
    }

    socket.onclose = () => {
      setConnected(false)
      setStreaming(false)
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
  }, [seriesType])  // reconnect & resubscribe whenever seriesType changes

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
          <select value={seriesType} onChange={handleSeriesChange}>
            <option value="line">Line</option>
            <option value="candlestick">Candlestick</option>
          </select>
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
