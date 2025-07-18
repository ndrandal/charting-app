// CandleStickChartGenerator.cpp
// Handles OHLC data and simple DataPoint series for candlestick rendering

#include "generators/CandleStickChartGenerator.hpp"
#include "RenderEngine.hpp"  // for ChartingApp::DataPoint
#include <algorithm>
#include <cstdint>

using ChartingApp::DrawCommand;

// Generate candlestick from full OHLC data
DrawCommand CandleStickChartGenerator::generate(
    const std::string& seriesId,
    const std::vector<OhlcPoint>& data
) {
    DrawCommand cmd;
    cmd.type     = "drawSeries";
    cmd.pane     = "main";
    cmd.seriesId = seriesId;
    cmd.style.color     = "#00ff00";
    cmd.style.thickness = 1;

    // Compute ranges
    int64_t minT = data.front().timestamp, maxT = minT;
    double  minP = data.front().low,       maxP = data.front().high;
    for (auto& bar : data) {
        minT = std::min(minT, bar.timestamp);
        maxT = std::max(maxT, bar.timestamp);
        minP = std::min(minP, bar.low);
        maxP = std::max(maxP, bar.high);
    }
    double tRange = double(maxT - minT);
    double pRange = maxP - minP;

    // Pack wick & body as LINES
    for (auto& bar : data) {
        float x = tRange > 0
            ? float(((bar.timestamp - minT) / tRange) * 2.0 - 1.0)
            : 0.0f;
        float yLow   = pRange > 0
            ? float(((bar.low   - minP) / pRange) * 2.0 - 1.0)
            : 0.0f;
        float yHigh  = pRange > 0
            ? float(((bar.high  - minP) / pRange) * 2.0 - 1.0)
            : 0.0f;
        float yOpen  = pRange > 0
            ? float(((bar.open  - minP) / pRange) * 2.0 - 1.0)
            : 0.0f;
        float yClose = pRange > 0
            ? float(((bar.close - minP) / pRange) * 2.0 - 1.0)
            : 0.0f;

        // Wick line
        cmd.vertices.push_back(x);
        cmd.vertices.push_back(yLow);
        cmd.vertices.push_back(x);
        cmd.vertices.push_back(yHigh);

        // Candle body
        bool isUp = bar.close >= bar.open;
        float colorY1 = isUp ? yClose : yOpen;
        float colorY2 = isUp ? yOpen  : yClose;
        float halfW   = 0.01f;

        // Top edge
        cmd.vertices.push_back(x - halfW);
        cmd.vertices.push_back(colorY1);
        cmd.vertices.push_back(x + halfW);
        cmd.vertices.push_back(colorY1);
        // Bottom edge
        cmd.vertices.push_back(x - halfW);
        cmd.vertices.push_back(colorY2);
        cmd.vertices.push_back(x + halfW);
        cmd.vertices.push_back(colorY2);
    }

    return cmd;
}

// DataPoint overload: convert DataPoint to OhlcPoint and delegate
DrawCommand CandleStickChartGenerator::generate(
    const std::string& seriesId,
    const std::vector<DataPoint>& data
) {
    std::vector<OhlcPoint> ohlc;
    ohlc.reserve(data.size());
    for (auto const& dp : data) {
        ohlc.push_back(OhlcPoint{
            dp.timestamp,
            dp.value, // open
            dp.value, // high
            dp.value, // low
            dp.value  // close
        });
    }
    return generate(seriesId, ohlc);
}
