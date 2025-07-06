#include <string>
#include <vector>
#include "ChartSeriesGenerator.hpp"
#include "DrawCommand.hpp"

using ChartingApp::DrawCommand;

class LineChartGenerator : public ChartSeriesGenerator {
public:
    DrawCommand generate(const std::string& seriesId, const std::vector<OhlcPoint>& data) override;
    DrawCommand generate(
        const std::string& seriesId,
        const std::vector<DataPoint>& data
    ) override;
};