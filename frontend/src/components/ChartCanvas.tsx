import React, { useRef, useEffect } from 'react';
import type { DrawBatch, DrawSeriesStyle } from '../types/protocol';

interface ChartCanvasProps {
  /** Active WebSocket connection */
  ws: WebSocket;
  /** Whether streaming is enabled */
  streaming: boolean;
}

/** Convert "#RRGGBB" → normalized RGB triplet */
function hexToRgbNormalized(hex: string): [number, number, number] {
  if (!hex.startsWith('#') || hex.length !== 7) return [0, 0, 0];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ ws, streaming }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batchRef = useRef<DrawBatch | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }

    // Compile shaders and link program
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, `#version 300 es
      in vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
      }
    `);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `#version 300 es
      precision mediump float;
      uniform vec4 u_color;
      out vec4 outColor;
      void main() {
        outColor = u_color;
      }
    `);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Look up locations
    const posLoc = gl.getAttribLocation(program, 'a_position');
    const colorLocRaw = gl.getUniformLocation(program, 'u_color');
    if (!colorLocRaw) {
      console.error('Uniform u_color not found');
      return;
    }
    const colorLoc = colorLocRaw;

    // Set up vertex buffer
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Resize handler
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
    };
    resize();
    window.addEventListener('resize', resize);

    // Listen for incoming draw batches
    const onMsg = (evt: MessageEvent) => {
      try {
        console.log(evt);
        const packet: DrawBatch = JSON.parse(evt.data);
        if (packet.type === 'drawCommands') {
          batchRef.current = packet;
        }
      } catch {
        // ignore malformed
      }
    };
    ws.addEventListener('message', onMsg);

    // Draw function
    const draw = () => {
      const batch = batchRef.current;
      if (!batch) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const cmd of batch.commands) {
        const style = cmd.style as DrawSeriesStyle;
        const [r, g, b] = hexToRgbNormalized(style.color);
        gl.uniform4f(colorLoc, r, g, b, 1);
        gl.lineWidth(style.thickness);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(cmd.vertices),
          gl.STATIC_DRAW
        );
        const prim = style.type === 'line' ? gl.LINE_STRIP : gl.LINES;
        gl.drawArrays(prim, 0, cmd.vertices.length / 2);
      }
    };

    // Render loop
    const loop = () => {
      if (!streaming) return;
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };
    if (streaming) loop();
    else cancelAnimationFrame(frameRef.current);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      ws.removeEventListener('message', onMsg);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [ws, streaming]);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh' }} />;
};

export default ChartCanvas;
