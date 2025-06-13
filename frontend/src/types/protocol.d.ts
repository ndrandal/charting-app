// frontend/src/types/protocol.d.ts

/** 
 * Messages sent from the client to the server 
 * - subscribe: start streaming with a given series style 
 * - unsubscribe: stop streaming 
 */
export type ClientToServer =
  | { 
      type: 'subscribe'; 
      /** Which style to stream: line vs candlestick */ 
      seriesType: 'line' | 'candlestick'; 
    }
  | { 
      type: 'unsubscribe'; 
    };

/** 
 * Style parameters for drawing a series 
 */
export interface DrawSeriesStyle {
  /** 'line' or 'candlestick' determines primitive type */
  type: 'line' | 'candlestick';
  /** Hex color string, e.g. "#00ff00" */
  color: string;
  /** Line width in pixels */
  thickness: number;
}

/** 
 * A single draw command, describing one series to render 
 */
export interface DrawSeriesCommand {
  /** Always 'drawSeries' */
  type: 'drawSeries';
  /** Pane identifier, e.g. 'main' */
  pane: string;
  /** Unique series ID */
  seriesId: string;
  /** Interleaved vertex coordinates [x0, y0, x1, y1, …] */
  vertices: number[];
  /** Styling info */
  style: DrawSeriesStyle;
}

/** 
 * Batch of draw commands sent from the server to the client 
 */
export interface DrawBatch {
  type: 'drawCommands';
  commands: DrawSeriesCommand[];
}
