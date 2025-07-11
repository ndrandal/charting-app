// src/components/ResizableChart.tsx
import React, { useRef, useEffect, useState } from 'react';
import ChartCanvas, { ChartCanvasProps } from './ChartCanvas';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { useTheme } from '../ThemeProvider';
import Draggable from 'react-draggable';

export type ResizableChartProps = Omit<ChartCanvasProps, 'width' | 'height'>;

export interface DataPoint { x: number; y: number; }

const ResizableChart: React.FC<ResizableChartProps> = props => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width: measuredW, height: measuredH } = useResizeObserver(containerRef);
  const [overrideSize, setOverrideSize] = useState<{ width?: number; height?: number }>({});
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const computedW = overrideSize.width ?? measuredW;
  const computedH = overrideSize.height ?? measuredH;

  // For resize dragging
  const resizing = useRef(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      setOverrideSize({
        width:  Math.max(100, resizeStart.current.w + dx),
        height: Math.max(100, resizeStart.current.h + dy),
      });
    };
    const onMouseUp = () => { resizing.current = false; };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    resizing.current = true;
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: computedW,
      h: computedH,
    };
  };

  // theme colors
  const { axisColor, plotBackground } = useTheme();

  // container styling supports override or auto-fill
    const style: React.CSSProperties = {
    position: 'absolute',
    width:  overrideSize.width  ?? '100%',
    height: overrideSize.height ?? '100%',
    backgroundColor: plotBackground,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: 4,
    };



  return (
    <Draggable
      bounds="parent"
      handle=".drag-handle"
      position={pos}
      onDrag={(_, data) => setPos({ x: data.x, y: data.y })}
    >
      <div ref={containerRef} style={style}>
        {/* Title bar as drag handle */}
        <div
          className="drag-handle"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 24,
            backgroundColor: axisColor,
            opacity: 0.15,
            cursor: 'move',
            borderTopLeftRadius: 4,
            borderTopRightRadius: 4,
            zIndex: 20,
          }}
          title="Drag to move"
        />

        {/* Chart drawing */}
        <ChartCanvas
          {...props}
          width={computedW}
          height={computedH}
        />

        {/* Resize handle */}
        <div
          onMouseDown={onResizeMouseDown}
          style={{
            position: 'absolute',
            width: 16,
            height: 16,
            bottom: 0,
            right: 0,
            cursor: 'se-resize',
            backgroundColor: axisColor,
            opacity: 0.6,
            borderTopLeftRadius: 4,
            zIndex: 10,
          }}
          title="Drag to resize"
        />
      </div>
    </Draggable>
  );
};

export default ResizableChart;
