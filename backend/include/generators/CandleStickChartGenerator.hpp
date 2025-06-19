#include "generators/CandleStickChartGenerator.hpp"
#include "DrawCommand.hpp"

DrawCommand CandleStickChartGenerator::generate(const std::string& label, const std::vector<OhlcPoint>& data) {
    DrawCommand cmd;
    cmd.type = "candlestick";
    cmd.label = label;

    for (const auto& pt : data) {
        cmd.timestamps.push_back(pt.timestamp);
        cmd.values.push_back(pt.close); // Assuming we visualize 'close'
    }

    return cmd;
}
