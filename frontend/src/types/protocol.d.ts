/**
 * Messages sent from the client to the server
 * - subscribe: start streaming with a given series style
 * - unsubscribe: stop streaming
 */
export type ClientToServer =
  | {
      type: 'subscribe';
      /** Which chart type to stream: line vs. candlestick */
      seriesType: 'line' | 'candlestick';
    }
  | {
      type: 'unsubscribe';
    };

/**
 * Base style fields common to all series
 */
interface BaseStyle {
  /** Name of the chart rendering strategy */
  type: 'line' | 'candlestick';
  /** Primary color in hex, e.g. "#22FF88" */
  color: string;
  /** Stroke thickness in pixels */
  thickness: number;
}

/**
 * Style for a line chart
 */
export interface LineStyle extends BaseStyle {
  type: 'line';
  // (Add future line-specific fields here)
}

/**
 * Style for a candlestick chart
 */
export interface CandlestickStyle extends BaseStyle {
  type: 'candlestick';
  /** Color for down-candles (close < open) */
  altColor: string;
  /** Optional color for wicks; if omitted, use `color` */
  wickColor?: string;
}

/**
 * Union of all supported series styles.
 * Add new chart types here as you implement new strategies.
 */
export type DrawSeriesStyle = LineStyle | CandlestickStyle;

/**
 * A single draw command to render one data series.
 */
export interface DrawSeriesCommand {
  /** Always "drawSeries" for series-rendering operations */
  type: 'drawSeries';
  /** Logical pane identifier (e.g. "main", "overlay") */
  pane: string;
  /** Unique series ID (for layering, updates, etc.) */
  seriesId: string;
  /** Interleaved [x0, y0, x1, y1, …], normalized to clip space */
  vertices: number[];
  /** Styling parameters for this series */
  style: DrawSeriesStyle;
}

/**
 * A batch of draw commands from the server.
 */
export interface DrawBatch {
  type: 'drawCommands';
  commands: DrawSeriesCommand[];
}
