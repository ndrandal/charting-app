// src/theme.ts

export interface Theme {
  axisColor:        string;
  gridMajorColor:   string;   // darker grid lines
  gridMinorColor:   string;   // lighter grid lines
  gridBandOpacity:  number;   // for alternating bands
  labelColor:       string;
  strokeColor:      string;
  strokeWidth:      number;
  fontFamily:       string;
  fontSize:         number;
  titleFontSize:    number;
  plotBackground: string;
  containerBackground: string;
}

export const defaultTheme: Theme = {
  containerBackground: "#282C34",
  plotBackground:      "#21252B",
  axisColor:           "#ABB2BF",
  gridMajorColor:      "#5C6370",
  gridMinorColor:      "#3E4451",
  gridBandOpacity:     0.04,
  labelColor:          "#828997",
  strokeColor:         "#61AFEF",  // sky-blue line
  strokeWidth:         2,
  fontFamily:          "sans-serif",
  fontSize:            10,
  titleFontSize:       14,
}

