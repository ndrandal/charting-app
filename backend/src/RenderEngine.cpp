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
+    rapidjson::Document doc;
+    doc.Parse(jsonStr.c_str());
+
+    // 1) Syntax check
+    if (doc.HasParseError()) {
+        std::cerr << "[RenderEngine] JSON parse error at offset "
+                  << doc.GetErrorOffset()
+                  << ": "
+                  << rapidjson::GetParseError_En(doc.GetParseError())
+                  << "\n";
+        return {};
+    }
+    // 2) Must be an array
+    if (!doc.IsArray()) {
+        std::cerr << "[RenderEngine] Input JSON is not an array.\n";
+        return {};
+    }
+    // 3) Guard against empty array
+    if (doc.GetArray().Empty()) {
+        std::cerr << "[RenderEngine] Input JSON array is empty.\n";
+        return {};
+    }
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