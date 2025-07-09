// src/theme.ts

export interface Theme {
  axisColor: string;
  gridColor: string;
  labelColor: string;
  strokeColor: string;
  strokeWidth: number;
  fontFamily: string;
  fontSize: number;
  titleFontSize: number;
  // later you can add gridMajorColor, bandOpacity, etc.
}

export const defaultTheme: Theme = {
  axisColor:    '#333',
  gridColor:    '#eee',
  labelColor:   '#333',
  strokeColor:  '#007acc',
  strokeWidth:  2,
  fontFamily:   'sans-serif',
  fontSize:     10,
  titleFontSize:14,
};
