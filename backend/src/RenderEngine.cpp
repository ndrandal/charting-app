#include "RenderEngine.hpp"
#include <fstream>
#include <sstream>
#include <rapidjson/document.h>
#include <iostream>
#include <algorithm> // for std::min / std::max

// ———————————————————————————————————————————————————————————
// Load time/value JSON from disk
// (matches declaration in RenderEngine.hpp)
// ———————————————————————————————————————————————————————————
std::vector<DataPoint> RenderEngine::loadData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buf;
    buf << ifs.rdbuf();
    rapidjson::Document doc;
    doc.Parse(buf.str().c_str());

    std::vector<DataPoint> pts;
    if (!doc.IsArray()) return pts;

    for (auto& v : doc.GetArray()) {
        if (!(v.HasMember("timestamp") && v.HasMember("value")))
            continue;
        DataPoint p;
        p.timestamp = v["timestamp"].GetInt64();
        p.value     = v["value"].GetDouble();
        pts.push_back(p);
    }
    return pts;
}

// ———————————————————————————————————————————————————————————
// Generate a simple line DrawCommand from DataPoint’s
// (matches declaration in RenderEngine.hpp)
// ———————————————————————————————————————————————————————————
std::vector<DrawCommand> RenderEngine::generateDrawCommands(const std::vector<DataPoint>& data) const {
    std::vector<DrawCommand> cmds;
    if (data.empty()) return cmds;

    // 1) find ranges
    int64_t minT = data.front().timestamp, maxT = minT;
    double  minV = data.front().value,     maxV = minV;
    for (auto& d : data) {
        minT = std::min(minT, d.timestamp);
        maxT = std::max(maxT, d.timestamp);
        minV = std::min(minV, d.value);
        maxV = std::max(maxV, d.value);
    }
    double tRange = double(maxT - minT);
    double vRange = maxV - minV;

    // 2) build the DrawCommand
    DrawCommand lineCmd;
    lineCmd.type            = "drawSeries";
    lineCmd.pane            = "main";
    lineCmd.seriesId        = "price";
    lineCmd.style.type      = "line";
    lineCmd.style.color     = "#00ff00";
    lineCmd.style.thickness = 1;
    lineCmd.vertices.reserve(data.size() * 2);

    for (auto& d : data) {
        float x = tRange > 0
            ? float(((d.timestamp - minT) / tRange) * 2.0 - 1.0)
            : 0.0f;
        float y = vRange > 0
            ? float(((d.value - minV) / vRange) * 2.0 - 1.0)
            : 0.0f;
        lineCmd.vertices.push_back(x);
        lineCmd.vertices.push_back(y);
    }

    cmds.push_back(std::move(lineCmd));
    return cmds;
}

// ———————————————————————————————————————————————————————————
// Load OHLC JSON from disk
// (matches declaration in RenderEngine.hpp)
// ———————————————————————————————————————————————————————————
std::vector<OhlcPoint> RenderEngine::loadOhlcData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buf;
    buf << ifs.rdbuf();
    rapidjson::Document doc;
    doc.Parse(buf.str().c_str());

    std::vector<OhlcPoint> bars;
    if (!doc.IsArray()) return bars;

    for (auto& v : doc.GetArray()) {
        if (!(v.HasMember("timestamp") &&
              v.HasMember("open") &&
              v.HasMember("high") &&
              v.HasMember("low") &&
              v.HasMember("close")))
            continue;
        OhlcPoint p;
        p.timestamp = v["timestamp"].GetInt64();
        p.open      = v["open"].GetDouble();
        p.high      = v["high"].GetDouble();
        p.low       = v["low"].GetDouble();
        p.close     = v["close"].GetDouble();
        bars.push_back(p);
    }
    return bars;
}

// ———————————————————————————————————————————————————————————
// Turn OHLC bars into a single candlestick DrawCommand
// (matches declaration in RenderEngine.hpp)
// ———————————————————————————————————————————————————————————
std::vector<DrawCommand> RenderEngine::generateOhlcDrawCommands(const std::vector<OhlcPoint>& data) const {
    std::vector<DrawCommand> cmds;
    if (data.empty()) return cmds;

    // 1) find ranges
    int64_t minT = data.front().timestamp, maxT = minT;
    double  minP = data.front().low,       maxP = data.front().high;
    for (auto& b : data) {
        minT = std::min(minT, b.timestamp);
        maxT = std::max(maxT, b.timestamp);
        minP = std::min(minP, b.low);
        maxP = std::max(maxP, b.high);
    }
    double tRange = double(maxT - minT);
    double pRange = maxP - minP;

    // 2) build the DrawCommand
    DrawCommand candleCmd;
    candleCmd.type       = "drawSeries";
    candleCmd.pane       = "main";
    candleCmd.seriesId   = "ohlc";
    candleCmd.style.type      = "candlestick";
    candleCmd.style.color     = "#00ff00";
    candleCmd.style.thickness = 1;
    candleCmd.vertices.reserve(data.size() * 8);

    for (auto& b : data) {
        float x     = tRange > 0 ? float(((b.timestamp - minT)/tRange)*2.0 - 1.0) : 0.0f;
        float yOpen  = pRange > 0 ? float(((b.open  - minP)/pRange)*2.0 - 1.0) : 0.0f;
        float yClose = pRange > 0 ? float(((b.close - minP)/pRange)*2.0 - 1.0) : 0.0f;
        float yHigh  = pRange > 0 ? float(((b.high  - minP)/pRange)*2.0 - 1.0) : 0.0f;
        float yLow   = pRange > 0 ? float(((b.low   - minP)/pRange)*2.0 - 1.0) : 0.0f;

        // [x, openY, x, closeY, x, highY, x, lowY]
        candleCmd.vertices.push_back(x); candleCmd.vertices.push_back(yOpen);
        candleCmd.vertices.push_back(x); candleCmd.vertices.push_back(yClose);
        candleCmd.vertices.push_back(x); candleCmd.vertices.push_back(yHigh);
        candleCmd.vertices.push_back(x); candleCmd.vertices.push_back(yLow);
    }

    cmds.push_back(std::move(candleCmd));
    return cmds;
}
