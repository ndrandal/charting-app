#pragma once

#include <string>
#include <vector>

namespace ChartingApp {

// A single series rendering command
struct DrawCommand {
    std::string type;       // e.g. "drawSeries"
    std::string label;      // human-readable name ("price", "ohlc", etc.)
    std::string pane;       // which pane to draw in ("main", "volume", etc.)
    std::string seriesId;   // identifier for the series ("price", "ohlc")
    std::vector<float> vertices; // flattened vertex list: [x0,y0, x1,y1, ...]
    struct Style {
        std::string color;     // primary color (e.g. "#00ff00")
        std::string altColor;  // secondary color (e.g. "#ff0000" for down candles)
        std::string wickColor; // wick color for candlesticks
        float thickness;       // line width in pixels
    } style;
};

} // namespace ChartingApp
