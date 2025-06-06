export type ClientToServer =
  | { type: 'subscribe'; requestedSeries: string[] }
  | { type: 'configChange'; seriesId: string; visible: boolean; color?: string; thickness?: number }
  | { type: 'paneChange'; panes: { id: string; heightRatio: number }[] }
  | { type: 'userDraw'; tool: string; pane: string; coords: { x1: number; y1: number; x2: number; y2: number }; style: { color: string; thickness: number } }
  | { type: 'themeChange'; theme: 'light' | 'dark' | 'custom'; colors?: Record<string, string> };

export type DrawSeriesCommand = {
  type: 'drawSeries';
  pane: string;
  seriesId: string;
  style: { type: 'line' | 'candlestick' | 'histogram'; color?: string; upColor?: string; downColor?: string; thickness?: number };
  vertices: number[]; // [x0, y0, x1, y1, …]
};

export type DrawBatchCommand = {
  type: 'drawBatch';
  panes: {
    id: string;
    series: DrawSeriesCommand[];
  }[];
};

export type PaneLayout = {
  type: 'paneLayout';
  panes: { id: string; heightRatio: number }[];
};

export type AxisLayout = {
  type: 'axisLayout';
  pane: string;
  yAxes: { id: string; side: 'left' | 'right'; ticks: { value: number; ndcY: number }[] }[];
  xAxis: { ticks: { timestamp: number; ndcX: number }[] };
};

// (Optional) For nested/inset panes:
export type InsetPane = {
  type: 'insetPane';
  id: string;
  parentPane: string;
  widthRatio: number;
  heightRatio: number;
  offsetXRatio: number;
  offsetYRatio: number;
  series: DrawSeriesCommand[];
};


