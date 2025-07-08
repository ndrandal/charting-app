// frontend/src/components/ChartCanvas.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { linearScale, niceTicks } from '../utils/scale';
import { determineTimeUnit, generateTimeTicks, formatTimeTick } from '../utils/time';

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
  theme = {},
  smooth = false,
  smoothSegments = 10,
}) => {
  const cfg = { ...defaultTheme, ...theme };
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
  const [hover, setHover] = useState<{ index:number; cx:number; cy:number; screenX:number; screenY:number }|null>(null);

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
    panRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
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
  const onMouseUp = () => { panRef.current = null; };
  useEffect(()=>{ window.addEventListener('mouseup', onMouseUp); return()=>window.removeEventListener('mouseup', onMouseUp); },[]);

  // hover
  const handleMouseMove = (e: React.MouseEvent) => {
    if (panRef.current) { onMouseMoveSvg(e); return; }
    const rect = containerRef.current!.getBoundingClientRect();
    const lx = e.clientX - rect.left - margin.left;
    const ly = e.clientY - rect.top - margin.top;
    if (lx<0||lx>innerWidth||ly<0||ly>innerHeight) { setHover(null); return; }
    const dataX = viewX[0] + (lx/innerWidth)*(viewX[1]-viewX[0]);
    let best=Infinity,idx=0;
    plotData.forEach((d,i)=>{ const dist=Math.abs(d.x-dataX); if(dist<best){best=dist;idx=i;} });
    const dpt = plotData[idx];
    setHover({ index:idx, cx:xScale(dpt.x), cy:yScale(dpt.y), screenX:e.clientX, screenY:e.clientY });
  };

  return (
    <div
      ref={containerRef}
      style={{ position:'relative', width, height, cursor: panRef.current?'grabbing':'grab' }}
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
          {hover && <><line x1={hover.cx} y1={0} x2={hover.cx} y2={innerHeight} stroke={axisColor} strokeDasharray='4 2'/><circle cx={hover.cx} cy={hover.cy} r={4} fill={strokeColor} stroke='#fff' strokeWidth={1}/></>}
        </g>
      </svg>
      {hover && <div style={{position:'fixed', left:hover.screenX+10, top:hover.screenY+10, background:'#fff', border:'1px solid #ccc', padding:'4px 8px', pointerEvents:'none', fontSize, fontFamily, color:labelColor, borderRadius:3, boxShadow:'0 1px 3px rgba(0,0,0,0.2)', whiteSpace:'nowrap'}}>
        <div><strong>x:</strong> {formatTimeTick(xTicks[hover.index], timeUnit)}</div>
        <div><strong>y:</strong> {plotData[hover.index].y}</div>
      </div>}
    </div>
  );
};

export default ChartCanvas;
