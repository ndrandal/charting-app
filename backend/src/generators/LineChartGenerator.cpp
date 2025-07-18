// LineChartGenerator.cpp
// Converts OHLC data into a normalized line-series based on closing prices

#include "generators/LineChartGenerator.hpp"
#include "RenderEngine.hpp"            // for ChartingApp::DataPoint
#include <algorithm>
#include <cstdint>

using ChartingApp::DrawCommand;


// Generate from OHLC data: uses close price for line chart
DrawCommand LineChartGenerator::generate(
    const std::string& seriesId,
    const std::vector<OhlcPoint>& data
) {
    DrawCommand cmd;
    cmd.type     = "drawSeries";
    cmd.pane     = "main";
    cmd.seriesId = seriesId;
    cmd.style.color     = "#00ff00";  // placeholder color
    cmd.style.thickness = 1;            // px

    // Compute min/max for X (timestamps) and Y (close values)
    auto [minIt, maxIt] = std::minmax_element(
        data.begin(), data.end(),
        [](auto const& a, auto const& b) {
            return a.timestamp < b.timestamp;
        }
    );
    int64_t minT = minIt->timestamp;
    int64_t maxT = maxIt->timestamp;

    auto [minVIt, maxVIt] = std::minmax_element(
        data.begin(), data.end(),
        [](auto const& a, auto const& b) {
            return a.close < b.close;
        }
    );
    double minV = minVIt->close;
    double maxV = maxVIt->close;

    cmd.vertices.reserve(data.size() * 2);
    for (auto const& pt : data) {
        cmd.vertices.push_back(static_cast<float>(pt.timestamp));
        cmd.vertices.push_back(static_cast<float>(pt.close));
    }
    return cmd;
}

// DataPoint overload: convert DataPoint to OHLC (all values equal) then delegate
DrawCommand LineChartGenerator::generate(
    const std::string& seriesId,
    const std::vector<DataPoint>& data
) {
    std::vector<OhlcPoint> ohlc;
    ohlc.reserve(data.size());
    for (auto const& dp : data) {
        ohlc.push_back(OhlcPoint{
            dp.timestamp,
            dp.value,  // open
            dp.value,  // high
            dp.value,  // low
            dp.value   // close
        });
    }
    return generate(seriesId, ohlc);
}
