import React, { useRef, useEffect } from 'react';
import type { ClientToServer, DrawBatch, DrawCommand, DrawSeriesStyle } from '../types/protocol';

const vertexSrc = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0, 1);
}
`;

const fragmentSrc = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 outColor;
void main() {
  outColor = u_color;
}
`;

// Helper to convert "#RRGGBB" → [r,g,b]
function hexToRgbNormalized(hex: string): [number, number, number] {
  if (!hex || hex[0] !== '#' || hex.length !== 7) {
    console.warn('Invalid color string, defaulting to black:', hex);
    return [0, 0, 0];
  }
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}


// at top of file, after hexToRgbNormalized(...)…

/**
 * Draw candlesticks: full wicks (high→low) and filled bodies (open→close).
 */
function drawCandlesticks(
  gl: WebGL2RenderingContext,
  posLoc: number,
  colorLoc: WebGLUniformLocation,
  buffer: WebGLBuffer,
  verts: number[],
  style: DrawSeriesStyle
) {
  // decode color once
  const [r, g, b] = hexToRgbNormalized(style.color);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  
  // We'll draw wicks with LINES and bodies with TRIANGLE_STRIP
  gl.lineWidth(style.thickness);

  // Compute a half‐width in NDC so candles have visible width.
  // Since verts.length = barCount * 8, barCount = verts.length/8.
  const barCount = verts.length / 8;
  const halfWidth = 0.8 / barCount;  // 80% of available slot

  for (let i = 0; i < verts.length; i += 8) {
    // unpack our 8‐value chunk:
    const xCenter = verts[i];
    const yOpen   = verts[i + 1];
    const yClose  = verts[i + 3];
    const yHigh   = verts[i + 5];
    const yLow    = verts[i + 7];

    // 1) Wick (high→low)
    gl.uniform4f(colorLoc, r, g, b, 1.0);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([xCenter, yHigh, xCenter, yLow]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0, 2);

    // 2) Body rectangle (open↔close)
    const x0 = xCenter - halfWidth;
    const x1 = xCenter + halfWidth;
    const y0 = yOpen;
    const y1 = yClose;

    // same color for body; you can vary based on y1 > y0 for up/down
    gl.uniform4f(colorLoc, r, g, b, 1.0);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        x0, y0,
        x1, y0,
        x0, y1,
        x1, y1
      ]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}


interface ChartCanvasProps {
  wsUrl: string;
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({wsUrl}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const gl = canvas.getContext('webgl2')!;
    // compile/link shaders…
    const vShader = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vShader, vertexSrc);
    gl.compileShader(vShader);
    const fShader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fShader, fragmentSrc);
    gl.compileShader(fShader);
    const program = gl.createProgram()!;
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    const colorLoc = gl.getUniformLocation(program, 'u_color')!;
    const positionBuffer = gl.createBuffer()!;

    const resize = () => {
      canvas.width  = canvas.clientWidth  * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize);
    resize();

    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      const msg: ClientToServer = { type: 'subscribe', requestedSeries: ['price'] };
      ws.send(JSON.stringify(msg));
    };

    ws.onmessage = (evt) => {
      const batch: DrawBatch = JSON.parse(evt.data);
      gl.clear(gl.COLOR_BUFFER_BIT);

      batch.commands.forEach((cmd: DrawCommand) => {
        if (cmd.type !== 'drawSeries') return;

        if (cmd.style.type === 'line') {
          const [r,g,b] = hexToRgbNorm(cmd.style.color);
          gl.uniform4f(colorLoc, r, g, b, 1);
          gl.lineWidth(cmd.style.thickness);
          gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cmd.vertices), gl.STATIC_DRAW);
          gl.enableVertexAttribArray(posLoc);
          gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
          gl.drawArrays(gl.LINE_STRIP, 0, cmd.vertices.length/2);

        } else if (cmd.style.type === 'candlestick') {
          drawCandlesticks(gl, posLoc, colorLoc, positionBuffer, cmd.vertices, cmd.style);
        }
      });
    };

    return () => {
      window.removeEventListener('resize', resize);
      ws.close();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100vw', height: '100vh', display: 'block' }}
    />
  );
};

export default ChartCanvas;
