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
