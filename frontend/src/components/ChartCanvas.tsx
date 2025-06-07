import React, { useRef, useEffect } from 'react';
import type { ClientToServer, DrawBatch, DrawCommand } from '../types/protocol';

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

interface Props {
  wsUrl: string;
}

const ChartCanvas: React.FC<Props> = ({ wsUrl }) => {
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const glRef      = useRef<WebGL2RenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const bufferRef     = useRef<WebGLBuffer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('WebGL2 not supported');
      return;
    }
    glRef.current = gl;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Compile shader helper
    const compileShader = (source: string, type: number): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Failed to create shader');
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error('Shader compile error: ' + log);
      }
      return shader;
    };


    // Link program
    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) {
      console.error('Failed to create program');
      return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);
    programRef.current = program;

    // Create buffer
    const buffer = gl.createBuffer();
    if (!buffer) {
      console.error('Failed to create buffer');
      return;
    }
    bufferRef.current = buffer;

    // Canvas resize handler
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    window.addEventListener('resize', resize);
    resize();

    // WebSocket setup
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      const msg: ClientToServer = { type: 'subscribe', requestedSeries: ['price'] };
      ws.send(JSON.stringify(msg));
    };

    ws.onmessage = (event) => {
      console.log(event);
      if (typeof event.data !== "string" || !event.data.trim()) {
        return
      }
      const batch = JSON.parse(event.data) as DrawBatch;
      if (batch.type !== 'drawCommands') return;

      const program = programRef.current;
      const buffer = bufferRef.current;
      if (!program || !buffer) return;

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

      const posLoc = gl.getAttribLocation(program, 'a_position');
      const colLoc = gl.getUniformLocation(program, 'u_color');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      for (const cmd of batch.commands) {
        const verts = new Float32Array(cmd.vertices);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        // Parse color
        const [r, g, b] = [
          parseInt(cmd.style.color.slice(1, 3), 16) / 255,
          parseInt(cmd.style.color.slice(3, 5), 16) / 255,
          parseInt(cmd.style.color.slice(5, 7), 16) / 255,
        ];
        if (colLoc) gl.uniform4f(colLoc, r, g, b, 1);

        // Draw primitives
        gl.lineWidth(cmd.style.thickness);
        if (cmd.type === 'axis') {
          gl.drawArrays(gl.LINES, 0, cmd.vertices.length / 2);
        } else {
          gl.drawArrays(gl.LINE_STRIP, 0, cmd.vertices.length / 2);
        }
      }
    };

    ws.onerror = (err) => console.error('WebSocket error', err);
    ws.onclose = () => console.log('WebSocket closed');

    return () => {
      window.removeEventListener('resize', resize);
      ws.close();
    };
  }, [wsUrl]);

  return <canvas ref={canvasRef} style={{ width: '100vw', height: '100vh', display: 'block' }} />;
};

export default ChartCanvas;
