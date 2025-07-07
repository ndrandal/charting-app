// frontend/src/components/ChartCanvas.tsx
import React, { useRef, useEffect, useState } from 'react';
import { linearScale, niceTicks } from '../utils/scale';

export interface DataPoint { x: number; y: number }

export interface ChartCanvasProps {
  width: number;
  height: number;
  data: DataPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  tickCount?: number;
  theme?: Partial<{
    axisColor: string;
    gridColor: string;
    labelColor: string;
    strokeColor: string;
    strokeWidth: number;
    fontFamily: string;
    fontSize: number;
    titleFontSize: number;
  }>;
  smooth?: boolean;
  smoothSegments?: number;
}

const defaultTheme = {
  axisColor:   '#333',
  gridColor:   '#eee',
  labelColor:  '#333',
  strokeColor: '#007acc',
  strokeWidth: 2,
  fontFamily:  'sans-serif',
  fontSize:    10,
  titleFontSize: 14,
};

function catmullRom(p0:number,p1:number,p2:number,p3:number,t:number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    2 * p1 +
    (p2 - p0) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function generateSmoothedData(pts: DataPoint[], segs: number): DataPoint[] {
  if (!segs || pts.length < 2) return pts;
  const out: DataPoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    for (let j = 0; j < segs; j++) {
      const t = j / segs;
      out.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function hexToRgba(hex: string): [number, number, number, number] {
  const c = hex.replace(/^#/, '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b, 1];
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({
  width,
  height,
  data,
  title,
  xLabel,
  yLabel,
  margin = { top: 30, right: 20, bottom: 40, left: 50 },
  tickCount = 5,
  theme = {},
  smooth = false,
  smoothSegments = 10,
}) => {
  const cfg = { ...defaultTheme, ...theme };
  const {
    axisColor,
    gridColor,
    labelColor,
    strokeColor,
    strokeWidth,
    fontFamily,
    fontSize,
    titleFontSize,
  } = cfg;

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Optionally smooth data
  const plotData = smooth
    ? generateSmoothedData(data, smoothSegments)
    : data;

  // Domains with guard for zero-span
  const xs = plotData.map(d => d.x);
  const ys = plotData.map(d => d.y);
  let xMin = Math.min(...xs), xMax = Math.max(...xs);
  let yMin = Math.min(...ys), yMax = Math.max(...ys);
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const xDomain: [number, number] = [xMin, xMax];
  const yDomain: [number, number] = [yMin, yMax];

  // Scales and ticks
  const xScale = linearScale(xDomain, [0, innerWidth]);
  const yScale = linearScale(yDomain, [innerHeight, 0]);
  const xTicks = niceTicks(xDomain, tickCount);
  const yTicks = niceTicks(yDomain, tickCount);

  // WebGL refs
  const progRef = useRef<WebGLProgram | null>(null);
  const bufRef = useRef<WebGLBuffer | null>(null);

  // Hover state
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{
    index: number;
    cx: number;
    cy: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  useEffect(() => {
    const canvasEl = containerRef.current?.querySelector('canvas');
    if (!canvasEl) return;
    const canvas = canvasEl as HTMLCanvasElement;
    const gl = canvas.getContext('webgl');
    if (!gl) return;

    // Compile shaders once
    if (!progRef.current) {
      const vsSrc = `attribute vec2 a_position; void main() { gl_Position = vec4(a_position,0,1); }`;
      const fsSrc = `precision mediump float; uniform vec4 u_color; void main() { gl_FragColor = u_color; }`;
      function compile(type: number, src: string) {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s)!);
        return s;
      }
      const vs = compile(gl.VERTEX_SHADER, vsSrc);
      const fs = compile(gl.FRAGMENT_SHADER, fsSrc);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(prog)!);
      progRef.current = prog;
      bufRef.current = gl.createBuffer();
    }

    // Build clip-space verts using full canvas dims + margin
    const verts = new Float32Array(plotData.length * 2);
    plotData.forEach(({ x, y }, i) => {
      const px = margin.left + xScale(x);
      const py = margin.top + yScale(y);
      const clipX = (px / width) * 2 - 1;
      const clipY = 1 - (py / height) * 2;
      verts[2*i]   = clipX;
      verts[2*i+1] = clipY;
    });

    // Draw
    gl.viewport(0,0,width,height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(progRef.current!);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufRef.current!);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(progRef.current!, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    const colorLoc = gl.getUniformLocation(progRef.current!, 'u_color')!;
    const [r,g,b,a] = hexToRgba(strokeColor);
    gl.uniform4f(colorLoc, r,g,b,a);
    gl.lineWidth(strokeWidth);
    gl.drawArrays(gl.LINE_STRIP, 0, plotData.length);
  }, [plotData, width, height, strokeColor, strokeWidth]);

  // Mouse move: invert pixel to domain, pick nearest, re-project
  const onMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const lx = e.clientX - rect.left - margin.left;
    const ly = e.clientY - rect.top - margin.top;
    if (lx < 0 || lx > innerWidth || ly < 0 || ly > innerHeight) {
      setHover(null);
      return;
    }
    const frac = lx / innerWidth;
    const dataX = xDomain[0] + frac * (xDomain[1] - xDomain[0]);
    let best = Infinity, idx = 0;
    plotData.forEach((d,i) => {
      const dist = Math.abs(d.x - dataX);
      if (dist < best) { best = dist; idx = i; }
    });
    const d = plotData[idx];
    const cx = xScale(d.x);
    const cy = yScale(d.y);
    setHover({ index: idx, cx, cy, screenX: e.clientX, screenY: e.clientY });
  };
  const onMouseLeave = () => setHover(null);

  return (
    <div
      ref={containerRef}
      style={{ position:'relative', width, height }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <canvas width={width} height={height} style={{ display:'block' }} />
      <svg width={width} height={height} style={{ position:'absolute', top:0, left:0, pointerEvents:'none' }}>
        {title && (
          <text x={width/2} y={margin.top/2} textAnchor="middle"
                fontFamily={fontFamily} fontSize={titleFontSize}
                fill={labelColor}>{title}</text>
        )}
        <g transform={`translate(${margin.left},${margin.top})`}>
          {xTicks.map((t,i)=>(
            <g key={i}>
              <line x1={xScale(t)} y1={0} x2={xScale(t)} y2={innerHeight} stroke={gridColor}/>
              <line x1={xScale(t)} y1={innerHeight}
                    x2={xScale(t)} y2={innerHeight+6} stroke={axisColor}/>
              <text x={xScale(t)} y={innerHeight+6+fontSize}
                    textAnchor="middle" fontFamily={fontFamily}
                    fontSize={fontSize} fill={labelColor}>{t}</text>
            </g>
          ))}
          {yTicks.map((t,i)=>(
            <g key={i}>
              <line x1={0} y1={yScale(t)} x2={innerWidth} y2={yScale(t)} stroke={gridColor}/>
              <line x1={-6} y1={yScale(t)} x2={0} y2={yScale(t)} stroke={axisColor}/>
              <text x={-8} y={yScale(t)} dy="0.32em"
                    textAnchor="end" fontFamily={fontFamily}
                    fontSize={fontSize} fill={labelColor}>{t}</text>
            </g>
          ))}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={axisColor}/>
          <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={axisColor}/>
          {xLabel && (
            <text x={innerWidth/2} y={innerHeight+margin.bottom-fontSize/2}
                  textAnchor="middle" fontFamily={fontFamily}
                  fontSize={fontSize} fill={labelColor}>{xLabel}</text>
          )}
          {yLabel && (
            <text transform={`translate(${-margin.left+fontSize/2},${innerHeight/2}) rotate(-90)`}
                  textAnchor="middle" fontFamily={fontFamily}
                  fontSize={fontSize} fill={labelColor}>{yLabel}</text>
          )}
          {hover && (
            <> 
              <line x1={hover.cx} y1={0} x2={hover.cx} y2={innerHeight}
                    stroke={axisColor} strokeDasharray="4 2"/>
              <circle cx={hover.cx} cy={hover.cy} r={4}
                      fill={strokeColor} stroke="#fff" strokeWidth={1}/>
            </>
          )}
        </g>
      </svg>
      {hover && (
        <div style={{ position:'fixed', left:hover.screenX+10, top:hover.screenY+10,
                      background:'#fff', border:'1px solid #ccc', padding:'4px 8px',
                      pointerEvents:'none', fontSize, fontFamily, color:labelColor,
                      borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,0.2)', whiteSpace:'nowrap' }}>
          <div><strong>x:</strong> {plotData[hover.index].x}</div>
          <div><strong>y:</strong> {plotData[hover.index].y}</div>
        </div>
      )}
    </div>
  );
};

export default ChartCanvas;
