#ifndef CHART_GENERATOR_FACTORY_HPP
#define CHART_GENERATOR_FACTORY_HPP

#include <memory>
#include <string>
#include <unordered_map>
#include <functional>
#include "ChartSeriesGenerator.hpp"
#include "LineChartGenerator.hpp"
#include "CandleStickChartGenerator.hpp"

class ChartGeneratorFactory {
public:
    static std::unique_ptr<ChartSeriesGenerator> createGenerator(const std::string& chartType);
private:
    using GeneratorCreator = std::function<std::unique_ptr<ChartSeriesGenerator>()>;
    static const std::unordered_map<std::string, GeneratorCreator>& getRegistry();
};

#endif // CHART_GENERATOR_FACTORY_HPP
