// frontend/src/renderers/index.ts
import { ChartRenderer } from './ChartRenderer';
import { LineChartRenderer } from './LineChartRenderer';
import { CandlestickChartRenderer } from './CandleStickChartRenderer';

export const chartRenderers: Record<string, ChartRenderer> = {
  line: new LineChartRenderer(),
  candlestick: new CandlestickChartRenderer(),
};
