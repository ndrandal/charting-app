
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

/// A single OHLC bar from an OHLC JSON feed
struct OhlcPoint {
    int64_t timestamp;
    double  open;
    double  high;
    double  low;
    double  close;
};

/// Knows how to load DataPoint’s from JSON and turn them into DrawSeriesCommand’s
class RenderEngine {
public:
    /// Reads an array of {"timestamp":…, "value":…} from disk
    static std::vector<DataPoint> loadData(const std::string& filePath);

    /// Normalizes timestamps→X in [–1..1], values→Y in [–1..1], packages into one DrawSeriesCommand
    std::vector<DrawCommand> generateDrawCommands(const std::vector<DataPoint>& data) const;

    /// Reads an array of {"timestamp":…, "open":…, "high":…, "low":…, "close":…}
    static std::vector<OhlcPoint> loadOhlcData(const std::string& filePath);

    /// Normalizes OHLC bars→X/Y and packages into a single "candlestick" DrawSeriesCommand
    std::vector<DrawCommand> generateOhlcDrawCommands(const std::vector<OhlcPoint>& data) const;

    
    // New: incremental generation from `fromIndex` (0-based)
    static std::vector<DrawCommand> generateIncrementalDrawCommands(const std::string& seriesType, const std::string& jsonArrayStr, size_t fromIndex);

};
