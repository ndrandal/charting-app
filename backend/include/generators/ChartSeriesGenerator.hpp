#pragma once

#include <string>
#include <vector>
#include "Protocol.hpp"
#include "RenderEngine.hpp"
#include "DrawCommand.hpp"


using ChartingApp::DrawCommand;

/**
 * Base class for all chart-series generators.
 * Supports two kinds of data: time/value points and OHLC bars.
 */
class ChartSeriesGenerator {
public:
    virtual ~ChartSeriesGenerator() = default;

    /// Generate a DrawCommand for a time/value series
    virtual DrawCommand generate(
        const std::string& seriesId,
        const std::vector<DataPoint>& data
    ) = 0;

    /// Generate a DrawCommand for an OHLC bar series
    virtual DrawCommand generate(
        const std::string& seriesId,
        const std::vector<OhlcPoint>& data
    ) = 0;
};
