// frontend/src/components/ChartCanvas.tsx
import React, { useRef, useEffect } from 'react';
import type { DrawBatchCommand, PaneLayout, DrawSeriesCommand } from '../types/protocol';

interface ChartCanvasProps {
  wsUrl: string;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ wsUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const bufferMapRef = useRef<Map<string, WebGLBuffer>>(new Map());
  const styleMapRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    glRef.current = gl;

    // Resize function (safe)
    let resizeScheduled = false;
    function resizeCanvas() {
      if (resizeScheduled) return;
      resizeScheduled = true;
      window.requestAnimationFrame(() => {
        resizeScheduled = false;
        if (!canvas || !gl) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (canvas.width === w && canvas.height === h) return;
        canvas.width = w;
        canvas.height = h;
        try {
          gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        } catch (e) {
          console.error('Error setting viewport', e);
        }
      });
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Initialize WebSocket
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      console.log('WebSocket connected to', wsUrl);
      // Example subscription
      ws.send(JSON.stringify({ type: 'subscribe', requestedSeries: ['price'] }));
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as DrawBatchCommand | PaneLayout;
      // TODO: parse and upload to GPU
      console.log('Received:', data);
    };
    ws.onerror = (err) => console.error('WebSocket error', err);
    ws.onclose = () => console.log('WebSocket closed');

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      ws.close();
    };
  }, [wsUrl]);

  return <canvas id="chartCanvas" ref={canvasRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ChartCanvas;
