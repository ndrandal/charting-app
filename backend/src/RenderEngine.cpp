// RenderEngine.cpp

#include "RenderEngine.hpp"
#include "generators/ChartGeneratorFactory.hpp"

#include <fstream>
#include <sstream>
#include <iostream>
#include <algorithm>

#include <rapidjson/document.h>
#include <rapidjson/error/en.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>

using ChartingApp::DrawCommand;

// Load time/value JSON from disk
std::vector<DataPoint> RenderEngine::loadData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    std::string jsonStr = buffer.str();

    rapidjson::Document doc;
    doc.Parse(jsonStr.c_str());
    if (doc.HasParseError()) {
        std::cerr << "[RenderEngine] JSON parse error at offset "
                  << doc.GetErrorOffset()
                  << ": "
                  << rapidjson::GetParseError_En(doc.GetParseError())
                  << std::endl;
        return {};
    }
    if (!doc.IsArray()) {
        std::cerr << "[RenderEngine] Input JSON is not an array." << std::endl;
        return {};
    }
    const auto& arr = doc.GetArray();
    if (arr.Empty()) {
        std::cerr << "[RenderEngine] Input JSON array is empty." << std::endl;
        return {};
    }

    std::vector<DataPoint> out;
    out.reserve(arr.Size());
    for (const auto& v : arr) {
        if (!v.IsObject()) continue;
        DataPoint pt;
        pt.timestamp = v["timestamp"].GetInt64();
        pt.value     = v["value"].GetDouble();
        out.push_back(pt);
    }
    return out;
}

// Generate draw commands for a DataPoint vector
std::vector<DrawCommand> RenderEngine::generateDrawCommands(
    const std::vector<DataPoint>& data
) const {
    auto gen = ChartGeneratorFactory::create("line");
    if (!gen) {
        std::cerr << "[RenderEngine] No generator registered for 'line'" << std::endl;
        return {};
    }
    DrawCommand cmd = gen->generate("price", data);
    return { std::move(cmd) };
}

// Load OHLC JSON from disk
std::vector<OhlcPoint> RenderEngine::loadOhlcData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    std::string jsonStr = buffer.str();

    rapidjson::Document doc;
    doc.Parse(jsonStr.c_str());
    if (doc.HasParseError() || !doc.IsArray()) {
        std::cerr << "[RenderEngine] Invalid OHLC JSON input." << std::endl;
        return {};
    }
    const auto& arr = doc.GetArray();
    std::vector<OhlcPoint> out;
    out.reserve(arr.Size());
    for (const auto& v : arr) {
        if (!v.IsObject()) continue;
        OhlcPoint bar;
        bar.timestamp = v["timestamp"].GetInt64();
        bar.open      = v["open"].GetDouble();
        bar.high      = v["high"].GetDouble();
        bar.low       = v["low"].GetDouble();
        bar.close     = v["close"].GetDouble();
        out.push_back(bar);
    }
    return out;
}

// Generate draw commands for OHLC data (candlestick)
std::vector<DrawCommand> RenderEngine::generateOhlcDrawCommands(
    const std::vector<OhlcPoint>& data
) const {
    auto gen = ChartGeneratorFactory::create("candlestick");
    if (!gen) {
        std::cerr << "[RenderEngine] No generator registered for 'candlestick'" << std::endl;
        return {};
    }
    DrawCommand cmd = gen->generate("ohlc", data);
    return { std::move(cmd) };
}

// Incremental generation from `fromIndex` (0-based)
std::vector<DrawCommand> RenderEngine::generateIncrementalDrawCommands(
    const std::string& seriesType,
    const std::string& jsonArrayStr,
    size_t fromIndex
) {
    rapidjson::Document doc;
    doc.Parse(jsonArrayStr.c_str());
    if (doc.HasParseError() || !doc.IsArray()) {
        std::cerr << "[RenderEngine] Invalid JSON for incremental data" << std::endl;
        return {};
    }

    const auto& arr = doc.GetArray();
    if (fromIndex >= arr.Size()) {
        // Nothing new
        return {};
    }

    // Parse only new DataPoints
    std::vector<DataPoint> sliceData;
    sliceData.reserve(arr.Size() - fromIndex);
    for (size_t i = fromIndex; i < arr.Size(); ++i) {
        const auto& v = arr[i];
        if (!v.IsObject()) continue;
        DataPoint pt;
        pt.timestamp = v["timestamp"].GetInt64();
        pt.value     = v["value"].GetDouble();
        sliceData.push_back(pt);
    }

    // Delegate to generator for this seriesType
    auto gen = ChartGeneratorFactory::create(seriesType);
    if (!gen) {
        std::cerr << "[RenderEngine] No generator registered for '" << seriesType << "'" << std::endl;
        return {};
    }
    DrawCommand cmd = gen->generate(seriesType, sliceData);
    return { std::move(cmd) };
}
