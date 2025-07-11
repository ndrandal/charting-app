import React from 'react';
import GlassCard from './GlassCard';
import ChartCanvas, { ChartCanvasProps } from './ChartCanvas';
import { useSize } from '../utils/useResizeObserver';

/**
 * Replaces manual-resize/draggable logic.
 * Uses react-grid-layout to control size & position.
 */
const ResizableChart: React.FC<ChartCanvasProps> = props => {
  const [containerRef, { width, height }] = useSize();

  return (
    <div ref={containerRef} className="h-full w-full">
      {width > 0 && height > 0 && (
        <GlassCard elevation="elevation2" className="h-full w-full">
          <ChartCanvas width={width} height={height} {...props} />
        </GlassCard>
      )}
    </div>
  );
};

export default ResizableChart;