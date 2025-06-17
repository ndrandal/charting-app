import React, { useRef, useEffect } from 'react';
import { chartRenderers } from '../renderers';
import type { DrawBatch } from '../types/protocol';

interface ChartCanvasProps {
  ws: WebSocket;
  streaming: boolean;
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

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(
      vs,
      `#version 300 es
      in vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0, 1); }
    `
    );
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(
      fs,
      `#version 300 es
      precision mediump float;
      uniform vec4 u_color;
      out vec4 outColor;
      void main() { outColor = u_color; }
    `
    );
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

    // Set up buffer & attributes
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Handle resizing
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth * dpr;
      const height = canvas.clientHeight * dpr;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
    };
    resize();
    window.addEventListener('resize', resize);

    // WebSocket message handler
    const onMsg = (evt: MessageEvent) => {
      try {
        const packet: DrawBatch = JSON.parse(evt.data);
        if (packet.type === 'drawCommands') batchRef.current = packet;
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
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array(cmd.vertices),
          gl.STATIC_DRAW
        );
        const renderer = chartRenderers[cmd.style.type];
        if (!renderer) {
          console.warn(`No renderer for type: ${cmd.style.type}`);
          continue;
        }
        renderer.draw(gl, cmd, colorLoc);
      }
    };

    // Animation loop
    const loop = () => {
      if (!streaming) return;
      draw();
      frameRef.current = requestAnimationFrame(loop);
    };
    if (streaming) loop();
    else cancelAnimationFrame(frameRef.current);

    // Cleanup
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
