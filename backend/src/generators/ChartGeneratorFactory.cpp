#include "generators/ChartGeneratorFactory.hpp"
#include "generators/LineChartGenerator.hpp"
#include "generators/CandlestickChartGenerator.hpp"

std::unique_ptr<ChartSeriesGenerator> ChartGeneratorFactory::create(const std::string& chartType) {
    if (chartType == "line") {
        return std::make_unique<LineChartGenerator>();
    }
    if (chartType == "candlestick") {
        return std::make_unique<CandlestickChartGenerator>();
    }
    return nullptr;
}
