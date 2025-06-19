#include "generators/ChartGeneratorFactory.hpp"
#include <iostream>

std::unique_ptr<ChartSeriesGenerator> ChartGeneratorFactory::createGenerator(const std::string& chartType) {
    const auto& registry = getRegistry();
    auto it = registry.find(chartType);
    if (it != registry.end()) {
        return it->second();
    } else {
        std::cerr << "ChartGeneratorFactory Error: Unknown chart type '" << chartType << "'\n";
        return nullptr;
    }
}

const std::unordered_map<std::string, ChartGeneratorFactory::GeneratorCreator>& ChartGeneratorFactory::getRegistry() {
    static const std::unordered_map<std::string, GeneratorCreator> registry = {
        {"line", []() { return std::make_unique<LineChartGenerator>(); }},
        {"candlestick", []() { return std::make_unique<CandleStickChartGenerator>(); }}
    };
    return registry;
}
