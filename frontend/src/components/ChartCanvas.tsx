// frontend/src/components/ChartCanvas.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { linearScale, niceTicks } from '../utils/scale';
import { determineTimeUnit, generateTimeTicks, formatTimeTick } from '../utils/time';
import { useTheme } from '../ThemeProvider';

export interface DataPoint { x: number; y: number; }

export interface ChartCanvasProps {
  width: number;
  height: number;
  data: DataPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  tickCount?: number;
  smooth?: boolean;
  smoothSegments?: number;
}

// Catmull–Rom spline for smoothing
function catmullRom(p0:number,p1:number,p2:number,p3:number,t:number) {
  const t2 = t*t;
  const t3 = t2*t;
  return 0.5 * (
    2*p1 + (p2-p0)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3
  );
}

function generateSmoothedData(pts: DataPoint[], segs: number): DataPoint[] {
  if (!segs || pts.length < 2) return pts;
  const out: DataPoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i-1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i+1];
    const p3 = pts[i+2] ?? pts[i+1];
    for (let j = 0; j < segs; j++) {
      const t = j / segs;
      out.push({
        x: catmullRom(p0.x,p1.x,p2.x,p3.x,t),
        y: catmullRom(p0.y,p1.y,p2.y,p3.y,t)
      });
    }
  }
  out.push(pts[pts.length-1]);
  return out;
}

// Convert hex "#rrggbb" to RGBA
function hexToRgba(hex: string): [number, number, number, number] {
  const c = hex.replace(/^#/, '');
  const r = parseInt(c.slice(0,2),16)/255;
  const g = parseInt(c.slice(2,4),16)/255;
  const b = parseInt(c.slice(4,6),16)/255;
  return [r,g,b,1];
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({
  width, height, data,
  title, xLabel, yLabel,
  margin = { top:30, right:20, bottom:40, left:50 },
  tickCount = 5,
  smooth = false,
  smoothSegments = 10,
}) => {
  const contextTheme = useTheme();
  const cfg  = { ...contextTheme};
  const { axisColor, gridColor, labelColor, strokeColor, strokeWidth, fontFamily, fontSize, titleFontSize } = cfg;

  const innerWidth  = width  - margin.left - margin.right;
  const innerHeight = height - margin.top  - margin.bottom;

  // raw data domains
  const rawXMin = useMemo(() => Math.min(...data.map(d=>d.x)), [data]);
  const rawXMax = useMemo(() => Math.max(...data.map(d=>d.x)), [data]);
  const rawYMin = useMemo(() => Math.min(...data.map(d=>d.y)), [data]);
  const rawYMax = useMemo(() => Math.max(...data.map(d=>d.y)), [data]);

  // view domains for zoom/pan
  const [viewX, setViewX] = useState<[number,number]>([rawXMin, rawXMax]);
  const [viewY, setViewY] = useState<[number,number]>([rawYMin, rawYMax]);
  useEffect(() => { setViewX([rawXMin, rawXMax]); setViewY([rawYMin, rawYMax]); }, [rawXMin, rawXMax, rawYMin, rawYMax]);

  // pan & state
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ startX:number; startY:number; xDomain:[number,number]; yDomain:[number,number]; mode:'x'|'y' }|null>(null);
  const zoomRef = useRef<{ axis: 'x'|'y'; startPos: number; startDomain: [number,number] }|null>(null);
  // optionally smooth
  const plotData = useMemo(() => (
    smooth ? generateSmoothedData(data, smoothSegments!) : data
  ), [data, smooth, smoothSegments]);

  // X ticks & labels
  const xSpan = viewX[1] - viewX[0];
  const timeUnit = determineTimeUnit(xSpan);
  const xTicks = generateTimeTicks(viewX, timeUnit);
  const xTickLabels = xTicks.map(t => formatTimeTick(t, timeUnit));

  // Y ticks
  let yMin = viewY[0], yMax = viewY[1];
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const yTicks = niceTicks([yMin, yMax], tickCount);

  // scales
  const xScale = useMemo(() => linearScale(viewX, [0, innerWidth]), [viewX, innerWidth]);
  const yScale = useMemo(() => linearScale([yMin, yMax], [innerHeight, 0]), [yMin, yMax, innerHeight]);

  // WebGL refs
  const progRef = useRef<WebGLProgram|null>(null);
  const bufRef  = useRef<WebGLBuffer|null>(null);

  // hover
  const [hover, setHover] = useState<{ index:number; cx:number; cy:number; screenX:number; screenY:number; xVal: number; yVal: number; }|null>(null);
  const [axisHover, setAxisHover] = useState<'x' | 'y' | null>(null);

  // draw line
  useEffect(() => {
    const canvas = containerRef.current?.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const gl = canvas.getContext('webgl'); if (!gl) return;
    if (!progRef.current) {
      const vs = 'attribute vec2 a_position; void main(){ gl_Position=vec4(a_position,0,1);}';
      const fs = 'precision mediump float; uniform vec4 u_color; void main(){ gl_FragColor=u_color;}';
      function compile(type:number, src:string){ const s=gl.createShader(type)!; gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)!); return s; }
      const vsh = compile(gl.VERTEX_SHADER, vs);
      const fsh = compile(gl.FRAGMENT_SHADER, fs);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vsh);
      gl.attachShader(prog, fsh);
      gl.linkProgram(prog);
      progRef.current = prog;
      bufRef.current = gl.createBuffer();
    }
    // build verts with view domains
    const verts = new Float32Array(plotData.length*2);
    plotData.forEach(({x,y},i)=>{
      const px = margin.left + xScale(x);
      const py = margin.top  + yScale(y);
      verts[2*i]   = (px/width)*2 - 1;
      verts[2*i+1] = 1 - (py/height)*2;
    });
    gl.viewport(0,0,width,height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(progRef.current!);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufRef.current!);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    const loc = gl.getAttribLocation(progRef.current!,'a_position'); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const cloc = gl.getUniformLocation(progRef.current!,'u_color')!;
    const [r,g,b,a] = hexToRgba(strokeColor);
    gl.uniform4f(cloc,r,g,b,a);
    gl.lineWidth(strokeWidth);
    gl.drawArrays(gl.LINE_STRIP,0,plotData.length);
  }, [plotData, viewX, viewY, width, height, strokeColor, strokeWidth]);

  // zoom (wheel)
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left - margin.left;
    const my = e.clientY - rect.top - margin.top;
    const fx = mx/innerWidth;
    const fy = my/innerHeight;
    const pivotX = viewX[0] + fx*(viewX[1]-viewX[0]);
    const pivotY = viewY[1] - fy*(viewY[1]-viewY[0]);
    const zoom = Math.exp(-e.deltaY * 0.002);
    setViewX([ pivotX + (viewX[0]-pivotX)*zoom, pivotX + (viewX[1]-pivotX)*zoom ]);
    setViewY([ pivotY + (viewY[0]-pivotY)*zoom, pivotY + (viewY[1]-pivotY)*zoom ]);
  };

  // pan (drag)
const onMouseDown = (e: React.MouseEvent) => {
  const rect = containerRef.current!.getBoundingClientRect();
  const absX = e.clientX - rect.left;   // pixel X within the whole container
  const absY = e.clientY - rect.top;    // pixel Y within the whole container

  // 1) X-axis zoom if we're anywhere in the bottom margin:
  //    That is, below the chart area (margin.top + innerHeight)
  if (absY > margin.top + innerHeight && absY < height) {
    // start X-zoom using the mouse’s chart-relative X
    zoomRef.current = {
      axis:     'x',
      startPos: absX - margin.left,
      startDomain: viewX
    };
    return;
  }

  // 2) Y-axis zoom if we're anywhere in the left margin:
  //    That is, to the left of the chart area (absX < margin.left)
  if (absX < margin.left && absX > 0) {
    // start Y-zoom using the mouse’s chart-relative Y
    zoomRef.current = {
      axis:     'y',
      startPos: absY - margin.top,
      startDomain: viewY
    };
    return;
  }

  // 3) Otherwise fall back to panning
  panRef.current = {
    startX: absX,
    startY: absY,
    xDomain: viewX,
    yDomain: viewY,
    mode: e.shiftKey ? 'y' : 'x'
  };
};


  const onMouseMoveSvg = (e: React.MouseEvent) => {
    if (!panRef.current) return;
    const { startX, startY, xDomain, yDomain, mode } = panRef.current;
    const rect = containerRef.current!.getBoundingClientRect();
    if (mode === 'x') {
      const dx = e.clientX - rect.left - startX;
      const shiftX = (-dx/innerWidth)*(xDomain[1]-xDomain[0]);
      setViewX([ xDomain[0]+shiftX, xDomain[1]+shiftX ]);
    } else {
      const dy = e.clientY - rect.top - startY;
      const shiftY = (dy/innerHeight)*(yDomain[1]-yDomain[0]);
      setViewY([ yDomain[0]+shiftY, yDomain[1]+shiftY ]);
    }
  };
  const onMouseUp = () => {
   panRef.current = null;
   zoomRef.current = null;
  };
  useEffect(()=>{ window.addEventListener('mouseup', onMouseUp); return()=>window.removeEventListener('mouseup', onMouseUp); },[]);

  const handleAxisZoom = (e: React.MouseEvent) => {
    const zr = zoomRef.current!;
    const rect = containerRef.current!.getBoundingClientRect();
    const absX = e.clientX - rect.left;
    const absY = e.clientY - rect.top;
    const lx = absX - margin.left;
    const ly = absY - margin.top;

    const currentPos = zr.axis === 'x' ? lx : ly;
    const length     = zr.axis === 'x' ? innerWidth : innerHeight;
    let   delta      = (currentPos - zr.startPos) / length;

    // flip for Y so pulling down expands
    if (zr.axis === 'y') delta = -delta;

    const [d0, d1] = zr.startDomain;
    const range    = d1 - d0;

    // compute raw new bounds
    let newStart = d0 + delta * range;
    let newEnd   = d1 - delta * range;

    // enforce a tiny minimum span (1e-6 × rawSpan)
    const rawSpan    = zr.axis === 'x' ? (rawXMax - rawXMin) : (rawYMax - rawYMin);
    const minSpan    = rawSpan * 1e-6;
    if (newEnd - newStart < minSpan) {
      const center = (newStart + newEnd) / 2;
      newStart = center - minSpan/2;
      newEnd   = center + minSpan/2;
    }

    // clamp back to data extents
   if (zr.axis === 'x') {
     setViewX([ newStart, newEnd ]);
   } else {
     setViewY([ newStart, newEnd ]);
   }
  };




  // hover
  const handleMouseMove = (e: React.MouseEvent) => {
    if (zoomRef.current) { handleAxisZoom(e); return; }
    if (panRef.current)  { onMouseMoveSvg(e); return; }
    const rect = containerRef.current!.getBoundingClientRect();
    const lx = e.clientX - rect.left - margin.left;
    const ly = e.clientY - rect.top  - margin.top;

    const absX = e.clientX - rect.left;
    const absY = e.clientY - rect.top;

    // only when not already dragging/panning
    if (!panRef.current && !zoomRef.current) {
      // bottom margin = X-axis
      if (absY > margin.top + innerHeight && absY < height) {
        setAxisHover('x');
      }
      // left margin = Y-axis
      else if (absX < margin.left && absX > 0) {
        setAxisHover('y');
      }
      else {
        setAxisHover(null);
      }
    }
    
    if (lx<0||lx>innerWidth||ly<0||ly>innerHeight) {
      setHover(null);
      return;
    }

    // nearest-data-index for optional tooltip use
    const dataX = viewX[0] + (lx/innerWidth)*(viewX[1]-viewX[0]);
    let best = Infinity, idx = 0;
    plotData.forEach((d,i) => {
      const dist = Math.abs(d.x - dataX);
      if (dist < best) { best = dist; idx = i; }
    });

    // compute data units under the cursor
    const xValue = viewX[0] + (lx/innerWidth)*(viewX[1]-viewX[0]);
    const yValue = viewY[1] - (ly/innerHeight)*(viewY[1]-viewY[0]);

    setHover({
      index:   idx,
      cx:      lx,
      cy:      ly,
      xVal:    xValue,
      yVal:    yValue,
      screenX: e.clientX,
      screenY: e.clientY,
    });
  };


  return (
    <div
      ref={containerRef}
      style={{ position:'relative', width, height, cursor: panRef.current
         ? 'grabbing'
         : zoomRef.current
           ? (zoomRef.current.axis === 'x' ? 'ew-resize' : 'ns-resize')
           : (axisHover === 'x'
               ? 'ew-resize'
               : axisHover === 'y'
                 ? 'ns-resize'
                 : 'crosshair') }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHover(null)}
    >
      <canvas width={width} height={height} style={{ display:'block' }}/>
      <svg width={width} height={height} style={{ position:'absolute', top:0, left:0, pointerEvents:'none' }}>
        {title && <text x={width/2} y={margin.top/2} textAnchor='middle' fontFamily={fontFamily} fontSize={titleFontSize} fill={labelColor}>{title}</text>}
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* X axis */}
          {xTicks.map((t,i)=>(
            <g key={i}>
              <line x1={xScale(t)} y1={0} x2={xScale(t)} y2={innerHeight} stroke={gridColor}/>
              <line x1={xScale(t)} y1={innerHeight} x2={xScale(t)} y2={innerHeight+6} stroke={axisColor}/>
              <text x={xScale(t)} y={innerHeight+6+fontSize} textAnchor='middle' fontFamily={fontFamily} fontSize={fontSize} fill={labelColor}>{xTickLabels[i]}</text>
            </g>
          ))}
          {/* Y axis */}
          {yTicks.map((t,i)=>(
            <g key={i}>
              <line x1={0} y1={yScale(t)} x2={innerWidth} y2={yScale(t)} stroke={gridColor}/>
              <line x1={-6} y1={yScale(t)} x2={0} y2={yScale(t)} stroke={axisColor}/>
              <text x={-8} y={yScale(t)} dy='0.32em' textAnchor='end' fontFamily={fontFamily} fontSize={fontSize} fill={labelColor}>{t}</text>
            </g>
          ))}
          <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke={axisColor}/>
          <line x1={0} y1={0} x2={0} y2={innerHeight} stroke={axisColor}/>
          {xLabel && <text x={innerWidth/2} y={innerHeight+margin.bottom-fontSize/2} textAnchor='middle' fontFamily={fontFamily} fontSize={fontSize} fill={labelColor}>{xLabel}</text>}
          {yLabel && <text transform={`translate(${-margin.left+fontSize/2},${innerHeight/2}) rotate(-90)`} textAnchor='middle' fontFamily={fontFamily} fontSize={fontSize} fill={labelColor}>{yLabel}</text>}
          {hover && (
            <>
              {/* vertical crosshair */}
              <line
                x1={hover.cx} y1={0}
                x2={hover.cx} y2={innerHeight}
                stroke={axisColor}
                strokeDasharray="4 2"
              />
              {/* horizontal crosshair */}
              <line
                x1={0}        y1={hover.cy}
                x2={innerWidth} y2={hover.cy}
                stroke={axisColor}
                strokeDasharray="4 2"
              />

              {/* X-axis tag */}
              <g>
                <rect
                  x={Math.max(hover.cx - 30, 0)}
                  y={innerHeight + 4}
                  width={60}
                  height={20}
                  fill={axisColor}
                  rx={3}
                  ry={3}
                />
                <text
                  x={hover.cx}
                  y={innerHeight + 4 + 14}
                  textAnchor="middle"
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  fill={labelColor}
                >
                  {formatTimeTick(hover.xVal, timeUnit)}
                </text>
              </g>

              {/* Y-axis tag */}
              <g>
                <rect
                  x={-margin.left + 4}
                  y={Math.max(hover.cy - 10, 0)}
                  width={margin.left - 8}
                  height={20}
                  fill={axisColor}
                  rx={3}
                  ry={3}
                />
                <text
                  x={-margin.left/2}
                  y={hover.cy + 4}
                  textAnchor="middle"
                  fontFamily={fontFamily}
                  fontSize={fontSize}
                  fill={labelColor}
                >
                  {hover.yVal.toFixed(2)}
                </text>
              </g>
            </>
          )}
        </g>
      </svg>
    </div>
  );
};

export default ChartCanvas;
