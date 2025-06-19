#pragma once

#include <memory>
#include <string>
#include "generators/ChartSeriesGenerator.hpp"

/**
 * Factory that returns the correct generator based on chartType.
 */
class ChartGeneratorFactory {
public:
    static std::unique_ptr<ChartSeriesGenerator> create(const std::string& chartType);
};
