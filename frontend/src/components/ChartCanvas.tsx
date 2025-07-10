// frontend/src/components/ChartCanvas.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { linearScale, niceTicks } from '../utils/scale';
import {
  determineTimeUnit,
  generateTimeTicks,
  formatTimeTick
} from '../utils/time';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { useTheme } from '../ThemeProvider';

export interface DataPoint { x: number; y: number; }
export interface ChartCanvasProps {
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
  const t2 = t*t, t3 = t2*t;
  return 0.5 * (
    2*p1 +
    (p2-p0)*t +
    (2*p0 - 5*p1 + 4*p2 - p3)*t2 +
    (-p0 + 3*p1 - 3*p2 + p3)*t3
  );
}
function generateSmoothedData(pts: DataPoint[], segs: number): DataPoint[] {
  if (!segs || pts.length < 2) return pts;
  const out: DataPoint[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i-1] ?? pts[i],
          p1 = pts[i],
          p2 = pts[i+1],
          p3 = pts[i+2] ?? pts[i+1];
    for (let j = 0; j < segs; j++) {
      const t = j / segs;
      out.push({ x: catmullRom(p0.x,p1.x,p2.x,p3.x,t), y: catmullRom(p0.y,p1.y,p2.y,p3.y,t) });
    }
  }
  out.push(pts[pts.length-1]);
  return out;
}
function hexToRgba(hex:string):[number,number,number,number] {
  const c = hex.replace(/^#/,'');
  return [
    parseInt(c.slice(0,2),16)/255,
    parseInt(c.slice(2,4),16)/255,
    parseInt(c.slice(4,6),16)/255,
    1
  ];
}

const ChartCanvas: React.FC<ChartCanvasProps> = ({
  data,
  title,
  xLabel,
  yLabel,
  margin = { top:30, right:20, bottom:40, left:50 },
  tickCount    = 5,
  smooth       = false,
  smoothSegments = 10,
}) => {
  // ─── Setup refs & theme ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const progRef      = useRef<WebGLProgram|null>(null);
  const bufRef       = useRef<WebGLBuffer|null>(null);

  const { width, height } = useResizeObserver(containerRef);
  const {
    containerBackground,
    plotBackground,
    axisColor,
    gridMajorColor,
    gridMinorColor,
    gridBandOpacity,
    labelColor,
    strokeColor,
    strokeWidth,
    fontFamily,
    fontSize,
    titleFontSize,
  } = useTheme();

  // ─── Data domains & view state ───────────────────────────────────────
  const rawXMin = useMemo(() => Math.min(...data.map(d=>d.x)), [data]);
  const rawXMax = useMemo(() => Math.max(...data.map(d=>d.x)), [data]);
  const rawYMin = useMemo(() => Math.min(...data.map(d=>d.y)), [data]);
  const rawYMax = useMemo(() => Math.max(...data.map(d=>d.y)), [data]);

  const [viewX, setViewX] = useState<[number,number]>([rawXMin, rawXMax]);
  const [viewY, setViewY] = useState<[number,number]>([rawYMin, rawYMax]);
  useEffect(() => {
    setViewX([rawXMin, rawXMax]);
    setViewY([rawYMin, rawYMax]);
  }, [rawXMin, rawXMax, rawYMin, rawYMax]);

  // ─── Smoothed vs raw plot data ───────────────────────────────────────
  const plotData = useMemo(
    () => smooth ? generateSmoothedData(data, smoothSegments!) : data,
    [data, smooth, smoothSegments]
  );

  // ─── Tick generation & scales ────────────────────────────────────────
  const xSpan    = viewX[1] - viewX[0];
  const timeUnit = determineTimeUnit(xSpan);
  const xTicks   = generateTimeTicks(viewX, timeUnit);
  const xLabels  = xTicks.map(t => formatTimeTick(t, timeUnit));

  let yMin = viewY[0], yMax = viewY[1];
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const yTicks = niceTicks([yMin, yMax], tickCount);

  // Only calculate inner dims once we've measured container
  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  const xScale = useMemo(() => linearScale(viewX, [0, innerW]), [viewX, innerW]);
  const yScale = useMemo(() => linearScale([yMin, yMax], [innerH, 0]), [yMin, yMax, innerH]);

  // ─── Interaction state ───────────────────────────────────────────────
  const panRef       = useRef<any>(null);
  const zoomRef      = useRef<any>(null);
  const [hover, setHover]         = useState<any>(null);
  const [axisHover, setAxisHover] = useState<'x'|'y'|null>(null);

  // ─── WebGL drawing effect ─────────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;
    const gl = canvasRef.current.getContext('webgl');
    if (!gl) return;

    // compile once
    if (!progRef.current) {
      const vs = `attribute vec2 a_position; void main(){ gl_Position=vec4(a_position,0,1);} `;
      const fs = `precision mediump float; uniform vec4 u_color; void main(){ gl_FragColor=u_color;} `;
      function compile(type:number, src:string) {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(sh)!);
        return sh;
      }
      const vsh = compile(gl.VERTEX_SHADER, vs);
      const fsh = compile(gl.FRAGMENT_SHADER, fs);
      const prog = gl.createProgram()!;
      gl.attachShader(prog, vsh);
      gl.attachShader(prog, fsh);
      gl.linkProgram(prog);
      progRef.current = prog;
      bufRef.current  = gl.createBuffer();
    }

    // build normalized device coords
    const verts = new Float32Array(plotData.length * 2);
    plotData.forEach(({x,y},i) => {
      const px = xScale(x), py = yScale(y);
      verts[2*i]   = (px/innerW)*2 - 1;
      verts[2*i+1] = 1 - (py/innerH)*2;
    });

    gl.viewport(0,0, innerW, innerH);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(progRef.current!);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufRef.current!);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);

    const loc = gl.getAttribLocation(progRef.current!, 'a_position');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const colorLoc = gl.getUniformLocation(progRef.current!, 'u_color')!;
    const [r,g,b,a] = hexToRgba(strokeColor);
    gl.uniform4f(colorLoc, r, g, b, a);
    gl.lineWidth(strokeWidth);
    gl.drawArrays(gl.LINE_STRIP, 0, plotData.length);
  }, [plotData, viewX, viewY, innerW, innerH, strokeColor, strokeWidth]);

  // ─── Event handlers ─────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const r  = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - r.left - margin.left;
    const my = e.clientY - r.top  - margin.top;
    const fx = mx/innerW, fy = my/innerH;
    const px = viewX[0] + fx*(viewX[1]-viewX[0]);
    const py = viewY[1] - fy*(viewY[1]-viewY[0]);
    const zf = Math.exp(-e.deltaY * 0.002);
    setViewX([ px + (viewX[0]-px)*zf, px + (viewX[1]-px)*zf ]);
    setViewY([ py + (viewY[0]-py)*zf, py + (viewY[1]-py)*zf ]);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    const r = containerRef.current!.getBoundingClientRect();
    const ax = e.clientX - r.left, ay = e.clientY - r.top;
    if (ay > margin.top+innerH && ay < height) {
      zoomRef.current = { axis:'x', startPos: ax-margin.left, startDomain: viewX };
      return;
    }
    if (ax > margin.left+innerW && ax < width) {
      zoomRef.current = { axis:'y', startPos: ay-margin.top, startDomain: viewY };
      return;
    }
    panRef.current = {
      startX: ax, startY: ay,
      xDomain: viewX, yDomain: viewY,
      mode: e.shiftKey ? 'y':'x'
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (zoomRef.current) {
      const zr = zoomRef.current;
      const r  = containerRef.current!.getBoundingClientRect();
      const ax = e.clientX - r.left, ay = e.clientY - r.top;
      let d = zr.axis==='x'
        ? (ax - margin.left - zr.startPos)/innerW
        : -(ay - margin.top - zr.startPos)/innerH;
      const [d0,d1] = zr.startDomain;
      const span = d1 - d0;
      let s = d0 + d*span, e1 = d1 - d*span;
      const rawSpan = zr.axis==='x' ? rawXMax-rawXMin : rawYMax-rawYMin;
      const minSp = rawSpan * 1e-6;
      if (e1 - s < minSp) {
        const mid = (s+e1)/2; s=mid-minSp/2; e1=mid+minSp/2;
      }
      zr.axis==='x' ? setViewX([s,e1]) : setViewY([s,e1]);
      return;
    }
    if (panRef.current) {
      const { startX, startY, xDomain, yDomain, mode } = panRef.current;
      const r = containerRef.current!.getBoundingClientRect();
      if (mode==='x') {
        const dx = (e.clientX - r.left - startX)/innerW;
        const shift = -dx*(xDomain[1]-xDomain[0]);
        setViewX([ xDomain[0]+shift, xDomain[1]+shift ]);
      } else {
        const dy = (e.clientY - r.top - startY)/innerH;
        const shift = dy*(yDomain[1]-yDomain[0]);
        setViewY([ yDomain[0]+shift, yDomain[1]+shift ]);
      }
      return;
    }
    const r = containerRef.current!.getBoundingClientRect();
    const ax = e.clientX - r.left, ay = e.clientY - r.top;
    if      (ay > margin.top+innerH && ay < height) setAxisHover('x');
    else if (ax > margin.left+innerW && ax < width) setAxisHover('y');
    else                                            setAxisHover(null);

    const lx = ax - margin.left, ly = ay - margin.top;
    if (lx<0||lx>innerW||ly<0||ly>innerH) { setHover(null); return; }
    const dataX = viewX[0] + (lx/innerW)*(viewX[1]-viewX[0]);
    let best=Infinity, idx=0;
    plotData.forEach((d,i)=>{
      const dist = Math.abs(d.x-dataX);
      if (dist<best) { best=dist; idx=i; }
    });
    const xVal = viewX[0] + (lx/innerW)*(viewX[1]-viewX[0]);
    const yVal = viewY[1] - (ly/innerH)*(viewY[1]-viewY[0]);
    setHover({ index:idx, cx:lx, cy:ly, xVal, yVal });
  };

  useEffect(()=>{
    const up = ()=>{ panRef.current=null; zoomRef.current=null; };
    window.addEventListener('mouseup', up);
    return ()=>window.removeEventListener('mouseup', up);
  },[]);

  // ─── CONDITIONAL RENDER UNTIL MEASURED ─────────────────────────────
  if (width === 0 || height === 0) {
    return (
      <div
        ref={containerRef}
        style={{ width:'100%', height:'100%', backgroundColor: containerBackground }}
      />
    );
  }

  // ─── ACTUAL RENDER ───────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{
        position:'relative',
        width:'100%',
        height:'100%',
        backgroundColor: containerBackground,
        overflow:'hidden',
        cursor: panRef.current
          ? 'grabbing'
          : zoomRef.current
            ? zoomRef.current.axis==='x' ? 'ew-resize' : 'ns-resize'
            : axisHover==='x'         ? 'ew-resize'
            : axisHover==='y'         ? 'ns-resize'
            : 'crosshair'
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseLeave={()=>setHover(null)}
    >
      {/* plot background */}
      <div
        style={{
          position:'absolute',
          top:     margin.top,
          left:    margin.left,
          width:   innerW,
          height:  innerH,
          backgroundColor: plotBackground,
          pointerEvents:   'none',
          zIndex: 0,
        }}
      />
      {/* WebGL canvas */}
      <canvas
        ref={canvasRef}
        className="inner"
        width={innerW}
        height={innerH}
        style={{
          position:'absolute',
          top: margin.top,
          left: margin.left,
          zIndex:1
        }}
      />
      {/* SVG grid, axes & hover */}
      <svg
        width={width}
        height={height}
        style={{ position:'absolute', top:0, left:0, pointerEvents:'none', zIndex:2 }}
      >
        {title && (
          <text
            x={width/2} y={margin.top/2}
            textAnchor="middle"
            fontFamily={fontFamily}
            fontSize={titleFontSize}
            fill={labelColor}
          >{title}</text>
        )}
        <g transform={`translate(${margin.left},${margin.top})`}>
          <defs>
            <clipPath id="gridClip"><rect x={0} y={0} width={innerW} height={innerH}/></clipPath>
          </defs>
          <g clipPath="url(#gridClip)">
            {yTicks.map((t,i)=> i < yTicks.length-1 && (
              <rect key={i}
                x={0}
                y={yScale(yTicks[i+1])}
                width={innerW}
                height={yScale(yTicks[i]) - yScale(yTicks[i+1])}
                fill={gridMinorColor}
                opacity={gridBandOpacity}
              />
            ))}
            {xTicks.map((t,i)=>(
              <line key={i}
                x1={xScale(t)} y1={0}
                x2={xScale(t)} y2={innerH}
                stroke={i%2===0?gridMajorColor:gridMinorColor}
                strokeWidth={i%2===0?1:0.5}
              />
            ))}
            {yTicks.map((t,i)=>(
              <line key={i}
                x1={0} y1={yScale(t)}
                x2={innerW} y2={yScale(t)}
                stroke={i%2===0?gridMajorColor:gridMinorColor}
                strokeWidth={i%2===0?1:0.5}
              />
            ))}
          </g>
          {xTicks.map((t,i)=>(
            <g key={`tx${i}`}>
              <line
                x1={xScale(t)} y1={innerH}
                x2={xScale(t)} y2={innerH+6}
                stroke={axisColor}
              />
              <text
                x={xScale(t)} y={innerH+6+fontSize}
                textAnchor="middle"
                fontFamily={fontFamily}
                fontSize={fontSize}
                fill={labelColor}
              >{xLabels[i]}</text>
            </g>
          ))}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke={axisColor}/>
          {yTicks.map((t,i)=>(
            <g key={`ty${i}`}>
              <line
                x1={innerW} y1={yScale(t)}
                x2={innerW+6} y2={yScale(t)}
                stroke={axisColor}
              />
              <text
                x={innerW+8} y={yScale(t)}
                dy="0.32em"
                textAnchor="start"
                fontFamily={fontFamily}
                fontSize={fontSize}
                fill={labelColor}
              >{t}</text>
            </g>
          ))}
          <line x1={innerW} y1={0} x2={innerW} y2={innerH} stroke={axisColor}/>
          {xLabel && (
            <text
              x={innerW/2}
              y={innerH + margin.bottom - fontSize/2}
              textAnchor="middle"
              fontFamily={fontFamily}
              fontSize={fontSize}
              fill={labelColor}
            >{xLabel}</text>
          )}
          {yLabel && (
            <text
              transform={`translate(${-margin.left+fontSize/2},${innerH/2}) rotate(-90)`}
              textAnchor="middle"
              fontFamily={fontFamily}
              fontSize={fontSize}
              fill={labelColor}
            >{yLabel}</text>
          )}
          {hover && <>
            <line
              x1={hover.cx} y1={0} x2={hover.cx} y2={innerH}
              stroke={axisColor} strokeDasharray="4 2"
            />
            <line
              x1={0} y1={hover.cy} x2={innerW} y2={hover.cy}
              stroke={axisColor} strokeDasharray="4 2"
            />
            <g>
              <rect
                x={Math.max(hover.cx-30,0)}
                y={innerH+4} width={60} height={20}
                fill={axisColor} rx={3} ry={3}
              />
              <text
                x={hover.cx} y={innerH+18}
                textAnchor="middle"
                fontFamily={fontFamily}
                fontSize={fontSize}
                fill={labelColor}
              >{formatTimeTick(hover.xVal,timeUnit)}</text>
            </g>
            <g>
              <rect
                x={innerW+4} y={Math.max(hover.cy-10,0)}
                width={margin.left-8} height={20}
                fill={axisColor} rx={3} ry={3}
              />
              <text
                x={innerW+4+(margin.left-8)/2} y={hover.cy+4}
                textAnchor="middle"
                fontFamily={fontFamily}
                fontSize={fontSize}
                fill={labelColor}
              >{hover.yVal.toFixed(2)}</text>
            </g>
          </>}
        </g>
      </svg>
    </div>
  );
};

export default ChartCanvas;
