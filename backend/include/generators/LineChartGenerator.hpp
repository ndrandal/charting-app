#pragma once

#include "generators/ChartSeriesGenerator.hpp"

/**
 * Generates a simple line chart from DataPoint series.
 */
class LineChartGenerator : public ChartSeriesGenerator {
public:
    // Only the DataPoint overload is implemented
    DrawCommand generate(
        const std::string& seriesId,
        const std::vector<DataPoint>& data
    ) override;

    // Not used for OHLC data
    DrawCommand generate(
        const std::string& seriesId,
        const std::vector<OhlcPoint>& data
    ) override {
        return DrawCommand{};
    }
};
