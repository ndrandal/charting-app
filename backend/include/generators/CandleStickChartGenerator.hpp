#pragma once

#include "generators/ChartSeriesGenerator.hpp"

/**
 * Generates a candlestick chart from OhlcPoint series.
 */
class CandlestickChartGenerator : public ChartSeriesGenerator {
public:
    // Not used for plain DataPoint series
    DrawCommand generate(
        const std::string& seriesId,
        const std::vector<DataPoint>& data
    ) override {
        return DrawCommand{};
    }

    // Only the OhlcPoint overload is implemented
    DrawCommand generate(
        const std::string& seriesId,
        const std::vector<OhlcPoint>& data
    ) override;
};
