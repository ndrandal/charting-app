#pragma once

#include <string>
#include <vector>
#include <cstdint>
#include "Protocol.hpp"

/// A single (timestamp, value) pair from sample_data.json
struct DataPoint {
    int64_t timestamp;
    double  value;
};

/// Knows how to load DataPoint’s from JSON and turn them into DrawSeriesCommand’s
class RenderEngine {
public:
    /// Reads an array of {"timestamp":…, "value":…} from disk
    static std::vector<DataPoint> loadData(const std::string& filePath);

    /// Normalizes timestamps→X in [–1..1], values→Y in [–1..1], packages into one DrawSeriesCommand
    std::vector<DrawSeriesCommand> generateLineChart(const std::vector<DataPoint>& data) const;
};
