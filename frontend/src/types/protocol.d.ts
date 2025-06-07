// frontend/src/types/protocol.d.ts

/** What the client sends */
export type ClientToServer = {
  type: 'subscribe';
  requestedSeries: string[];
};

/** Style for a series */
export type DrawSeriesStyle =
  | {
      type: 'line';
      color: string;      // "#RRGGBB"
      thickness: number;  // px
    }
  | {
      type: 'candlestick';
      color: string;      // body color (future: split up/down)
      thickness: number;  // wick & body width
    };

/** Command to draw one series */
export interface DrawSeriesCommand {
  type: 'drawSeries';
  pane: string;
  seriesId: string;
  style: DrawSeriesStyle;
  vertices: number[];   // line: [x0,y0, x1,y1,…] | candle: [x,o, x,c, x,h, x,l,…]
}

export type DrawCommand = DrawSeriesCommand | /*…other commands*/ any;

export interface DrawBatch {
  type: 'drawCommands';
  commands: DrawCommand[];
}


/** Batch of commands in one packet */
export interface DrawBatch {
  type: 'drawCommands';
  commands: DrawCommand[];
}

