#include "generators/LineChartGenerator.hpp"
#include <algorithm>

DrawCommand LineChartGenerator::generate(
    const std::string& seriesId,
    const std::vector<DataPoint>& data
) {
    DrawCommand cmd;
    cmd.type     = "drawSeries";
    cmd.pane     = "main";
    cmd.seriesId = seriesId;
    cmd.style.color     = "#00ff00";  // placeholder color
    cmd.style.thickness = 1;          // px

    // Compute min/max for X (timestamps) and Y (values)
    int64_t minT = data.front().timestamp, maxT = minT;
    double  minV = data.front().value,     maxV = minV;
    for (auto& pt : data) {
        minT = std::min(minT, pt.timestamp);
        maxT = std::max(maxT, pt.timestamp);
        minV = std::min(minV, pt.value);
        maxV = std::max(maxV, pt.value);
    }
    double tRange = double(maxT - minT);
    double vRange = maxV - minV;

    // Normalize and pack vertices
    for (auto& pt : data) {
        float x = tRange > 0
            ? float(((pt.timestamp - minT) / tRange) * 2.0 - 1.0)
            : 0.0f;
        float y = vRange > 0
            ? float(((pt.value - minV) / vRange) * 2.0 - 1.0)
            : 0.0f;
        cmd.vertices.push_back(x);
        cmd.vertices.push_back(y);
    }

    return cmd;
}
