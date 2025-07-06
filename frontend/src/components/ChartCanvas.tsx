import React, { useRef, useEffect } from 'react';
import { chartRenderers } from '../renderers';
import type { DrawBatch } from '../types/protocol';

interface ChartCanvasProps {
  ws: WebSocket;
  streaming: boolean;
}

// GLSL shaders
const vertexShaderSrc = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0, 1);
}
`;
const fragmentShaderSrc = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vertSrc: string,
  fragSrc: string
): WebGLProgram {
  const vert = compileShader(gl, vertSrc, gl.VERTEX_SHADER);
  const frag = compileShader(gl, fragSrc, gl.FRAGMENT_SHADER);
  const program = gl.createProgram()!;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({ ws, streaming }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const batchRef = useRef<DrawBatch | null>(null);
  const frameRef = useRef<number>();
  const glRef = useRef<WebGL2RenderingContext>();
  const programRef = useRef<WebGLProgram>();
  const colorLocRef = useRef<WebGLUniformLocation>();
  const bufferRef = useRef<WebGLBuffer>();

  // 1) Handle incoming WS messages
  useEffect(() => {
    if (!ws) return;
    const onMessage = (event: MessageEvent) => {
      console.log('[WS] Received:', event.data);
      try {
        const data = JSON.parse(event.data) as DrawBatch;
        if (data.type === 'drawCommands') {
          batchRef.current = data;
        }
      } catch (e) {
        console.error('[WS] Invalid JSON:', e);
      }
    };
    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [ws]);

  // 2) Initialize WebGL
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      console.error('[GL] WebGL2 not supported');
      return;
    }
    glRef.current = gl;

    // Set clear color to white for visibility
    gl.clearColor(1, 1, 1, 1);

    // Compile and link shaders
    let program: WebGLProgram;
    try {
      program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
    } catch (e) {
      console.error('[GL] Shader program failed:', e);
      return;
    }
    gl.useProgram(program);
    programRef.current = program;

    // Look up attribute/uniform locations
    const posLoc = gl.getAttribLocation(program, 'a_position');
    const colorLoc = gl.getUniformLocation(program, 'u_color');
    console.log('[GL] posLoc=', posLoc, 'colorLoc=', colorLoc);
    if (posLoc < 0 || !colorLoc) {
      console.error('[GL] Invalid attribute/uniform location');
      return;
    }
    gl.enableVertexAttribArray(posLoc);

    // Create and bind buffer
    const buffer = gl.createBuffer();
    if (!buffer) {
      console.error('[GL] Failed to create buffer');
      return;
    }
    bufferRef.current = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    colorLocRef.current = colorLoc;

    // Handle canvas resize
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        console.log('[GL] Resized viewport to', w, 'x', h);
      }
    };
    window.addEventListener('resize', resize);
    resize();

    return () => {
      window.removeEventListener('resize', resize);
      if (programRef.current) gl.deleteProgram(programRef.current);
      if (bufferRef.current) gl.deleteBuffer(bufferRef.current);
    };
  }, []);

  // 3) Render loop
  useEffect(() => {
    if (!streaming) return;
    const gl = glRef.current!;
    const program = programRef.current!;
    const colorLoc = colorLocRef.current!;

    const renderLoop = () => {
      gl.clear(gl.COLOR_BUFFER_BIT);

      const canvas = canvasRef.current!;
      const batch = batchRef.current;


      if (batch) {
        batch.commands.forEach(cmd => {
          // Set viewport based on pane
          const h = canvas.height;
          const w = canvas.width;
          if (cmd.pane === 'main') {
            gl.viewport(0, Math.floor(h * 0.3), w, Math.floor(h * 0.7));
          } else if (cmd.pane === 'volume') {
            gl.viewport(0, 0, w, Math.floor(h * 0.3));
          } else {
            gl.viewport(0, 0, w, h);
          }

          // Direct GL draw test (bypass renderers)
          gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current!);
          const verts = new Float32Array(cmd.vertices);
          gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);
          // parse hex color
          const hex = cmd.style.color.replace('#','');
          const r = parseInt(hex.slice(0,2),16)/255;
          const g = parseInt(hex.slice(2,4),16)/255;
          const b = parseInt(hex.slice(4,6),16)/255;
          gl.uniform4f(colorLoc, r, g, b, 1);
          gl.drawArrays(gl.LINES, 0, verts.length / 2);

          // Or call custom renderer:
          /*
          const renderer = chartRenderers[cmd.seriesId];
          if (renderer) {
            renderer.draw(gl, cmd, colorLoc);
          } else {
            console.warn('[Render] No renderer for', cmd.seriesId);
          }
          */
        });
      }

      frameRef.current = requestAnimationFrame(renderLoop);
    };

    frameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [streaming]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', border: '1px solid #ccc' }}
    />
  );
};

export default ChartCanvas;
