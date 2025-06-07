// frontend/src/types/protocol.d.ts

/** What the client sends */
export type ClientToServer = {
  type: 'subscribe';
  requestedSeries: string[];
};

/** What the backend sends */
export type DrawSeriesCommand = {
  type: 'drawSeries';
  pane: string;
  seriesId: string;
  style: {
    type: 'line';
    color: string;
    thickness: number;
  };
  vertices: number[];  // [ x0, y0, x1, y1, … ]
};


/** One generic draw command */
export interface DrawCommand {
  type: 'axis' | 'drawSeries';
  pane: string;
  vertices: number[];       // [x0,y0, x1,y1, …]
  style: {
    color: string;          // "#RRGGBB"
    thickness: number;      // px
  };
}

/** Batch of commands in one packet */
export interface DrawBatch {
  type: 'drawCommands';
  commands: DrawCommand[];
}