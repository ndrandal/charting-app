// backend/src/RenderEngine.cpp

#include "RenderEngine.hpp"
#include "generators/ChartGeneratorFactory.hpp"  // ← new

#include <fstream>
#include <sstream>
#include <rapidjson/document.h>
#include <iostream>
#include <algorithm>

// ———————————————————————————————————————————————————————————
// Load time/value JSON from disk (unchanged)
// ———————————————————————————————————————————————————————————
std::vector<DataPoint> RenderEngine::loadData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    rapidjson::Document doc;
    doc.Parse(buffer.str().c_str());
    std::vector<DataPoint> out;
    if (!doc.IsArray()) return out;
    out.reserve(doc.Size());
    for (auto& v : doc.GetArray()) {
        if (!v.IsObject()) continue;
        DataPoint pt;
        pt.timestamp = v["timestamp"].GetInt64();
        pt.value     = v["value"].GetDouble();
        out.push_back(pt);
    }
    return out;
}

// ———————————————————————————————————————————————————————————
// Refactored: use ChartGeneratorFactory to get the right generator
// ———————————————————————————————————————————————————————————
std::vector<DrawCommand> RenderEngine::generateDrawCommands(
    const std::vector<DataPoint>& data
) const {
    // Lookup the line-chart generator
    auto gen = ChartGeneratorFactory::create("line");
    if (!gen) {
        std::cerr << "[RenderEngine] No generator registered for 'line'\n";
        return {};
    }
    // Generate a single DrawCommand for this series
    DrawCommand cmd = gen->generate("price", data);
    // Wrap it in a vector for the caller
    return { std::move(cmd) };
}

// ———————————————————————————————————————————————————————————
// Load OHLC JSON from disk (unchanged, if present)
// ———————————————————————————————————————————————————————————
std::vector<OhlcPoint> RenderEngine::loadOhlcData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    rapidjson::Document doc;
    doc.Parse(buffer.str().c_str());
    std::vector<OhlcPoint> out;
    if (!doc.IsArray()) return out;
    out.reserve(doc.Size());
    for (auto& v : doc.GetArray()) {
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

// ———————————————————————————————————————————————————————————
// Refactored: use ChartGeneratorFactory for candlesticks
// ———————————————————————————————————————————————————————————
std::vector<DrawCommand> RenderEngine::generateOhlcDrawCommands(
    const std::vector<OhlcPoint>& data
) const {
    // Lookup the candlestick-chart generator
    auto gen = ChartGeneratorFactory::create("candlestick");
    if (!gen) {
        std::cerr << "[RenderEngine] No generator registered for 'candlestick'\n";
        return {};
    }
    // Generate one DrawCommand for the OHLC series
    DrawCommand cmd = gen->generate("ohlc", data);
    // Wrap it for the caller
    return { std::move(cmd) };
}


std::vector<DrawCommand> RenderEngine::generateDrawCommands(const std::string& chartType, const std::string& jsonStr) {
    rapidjson::Document doc;
    doc.Parse(jsonStr.c_str());

    if (!doc.IsArray()) {
        std::cerr << "[RenderEngine] Input JSON is not an array.\n";
        return {};
    }

    // Try creating the generator
    auto gen = ChartGeneratorFactory::create(chartType);
    if (!gen) {
        std::cerr << "[RenderEngine] No generator registered for chartType: " << chartType << "\n";
        return {};
    }

    if (chartType == "line") {
        std::vector<DataPoint> data;
        for (auto& v : doc.GetArray()) {
            if (!v.IsObject() || !v.HasMember("timestamp") || !v.HasMember("value")) continue;
            DataPoint pt;
            pt.timestamp = v["timestamp"].GetInt64();
            pt.value = v["value"].GetDouble();
            data.push_back(pt);
        }
        DrawCommand cmd = gen->generate("series", data);
        return { std::move(cmd) };

    } else if (chartType == "candlestick") {
        std::vector<OhlcPoint> data;
        for (auto& v : doc.GetArray()) {
            if (!v.IsObject() || !v.HasMember("timestamp")) continue;
            OhlcPoint pt;
            pt.timestamp = v["timestamp"].GetInt64();
            pt.open = v["open"].GetDouble();
            pt.high = v["high"].GetDouble();
            pt.low  = v["low"].GetDouble();
            pt.close = v["close"].GetDouble();
            data.push_back(pt);
        }
        DrawCommand cmd = gen->generate("ohlc", data);
        return { std::move(cmd) };

    } else {
        std::cerr << "[RenderEngine] Unhandled chartType in dynamic dispatch: " << chartType << "\n";
        return {};
    }
}
