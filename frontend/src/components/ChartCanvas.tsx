// frontend/src/components/ChartCanvas.tsx

import React, { useRef, useEffect } from 'react';
import type { ClientToServer, DrawSeriesCommand } from '../types/protocol';

interface ChartCanvasProps {
  wsUrl: string;
}

const vertexShaderSource = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0, 1);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}
`;

const ChartCanvas: React.FC<ChartCanvasProps> = ({ wsUrl }) => {
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const glRef         = useRef<WebGL2RenderingContext>();
  const programRef    = useRef<WebGLProgram>();
  const positionBufRef= useRef<WebGLBuffer>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    glRef.current = gl;

    // --- Compile & link shaders ---
    const compile = (src: string, type: number): WebGLShader => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        gl.deleteShader(s);
      }
      return s;
    };
    const vShader = compile(vertexShaderSource,   gl.VERTEX_SHADER);
    const fShader = compile(fragmentShaderSource, gl.FRAGMENT_SHADER);

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vShader);
    gl.attachShader(prog, fShader);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);
    programRef.current = prog;

    // --- Create buffer ---
    positionBufRef.current = gl.createBuffer()!;

    // --- Setup canvas resize & viewport ---
    const resize = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    // --- Open WebSocket & subscribe ---
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      console.log('WebSocket connected');
      const msg: ClientToServer = { type: 'subscribe', requestedSeries: ['price'] };
      ws.send(JSON.stringify(msg));
    };

    ws.onmessage = (ev) => {
      const cmd = JSON.parse(ev.data) as DrawSeriesCommand;
      if (cmd.type !== 'drawSeries') return;

      // Upload vertices
      const verts = new Float32Array(cmd.vertices);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBufRef.current);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

      // Link attribute
      const aPos = gl.getAttribLocation(prog, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Set color
      const col = cmd.style.color;
      const r   = parseInt(col.slice(1,3),16)/255;
      const g   = parseInt(col.slice(3,5),16)/255;
      const b   = parseInt(col.slice(5,7),16)/255;
      const uCol= gl.getUniformLocation(prog, 'u_color');
      gl.uniform4f(uCol, r, g, b, 1);

      // Draw
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.LINE_STRIP, 0, cmd.vertices.length / 2);
    };

    ws.onerror = err => console.error('WebSocket error', err);
    ws.onclose = () => console.log('WebSocket closed');

    return () => {
      window.removeEventListener('resize', resize);
      ws.close();
    };
  }, [wsUrl]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', display: 'block' }}
    />
  );
};

export default ChartCanvas;
