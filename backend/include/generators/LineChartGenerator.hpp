#include "generators/LineChartGenerator.hpp"
#include "DrawCommand.hpp"

DrawCommand LineChartGenerator::generate(const std::string& label, const std::vector<DataPoint>& data) {
    DrawCommand cmd;
    cmd.type = "line";
    cmd.label = label;

    for (const auto& pt : data) {
        cmd.timestamps.push_back(pt.timestamp);
        cmd.values.push_back(pt.value);
    }

    return cmd;
}
