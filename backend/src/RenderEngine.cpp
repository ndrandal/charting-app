// backend/src/RenderEngine.cpp

#include "RenderEngine.hpp"
#include <fstream>
#include <sstream>
#include <rapidjson/document.h>
#include <iostream>

std::vector<DataPoint> RenderEngine::loadData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Failed to open data file: " << filePath << std::endl;
        return {};
    }
    std::stringstream buf;
    buf << ifs.rdbuf();

    rapidjson::Document doc;
    doc.Parse(buf.str().c_str());
    if (!doc.IsArray()) {
        std::cerr << "[RenderEngine] JSON is not an array in " << filePath << std::endl;
        return {};
    }

    std::vector<DataPoint> out;
    for (auto& v : doc.GetArray()) {
        DataPoint dp;
        if (v.HasMember("timestamp") && v["timestamp"].IsInt64()) {
            dp.timestamp = v["timestamp"].GetInt64();
        } else if (v.HasMember("timestamp") && v["timestamp"].IsInt()) {
            dp.timestamp = v["timestamp"].GetInt();
        } else {
            dp.timestamp = 0;
        }
        if (v.HasMember("value") && v["value"].IsNumber()) {
            dp.value = v["value"].GetDouble();
        } else {
            dp.value = 0.0;
        }
        out.push_back(dp);
    }
    return out;
}

std::vector<DrawSeriesCommand> RenderEngine::generateLineChart(const std::vector<DataPoint>& data) const {
    std::vector<DrawSeriesCommand> commands;
    if (data.empty()) return commands;

    // 1) Prepare the command
    DrawSeriesCommand cmd;
    cmd.type     = "drawSeries";
    cmd.pane     = "main";
    cmd.seriesId = "price";
    cmd.style.type      = "line";
    cmd.style.color     = "#00ff00";
    cmd.style.thickness = 2;

    // 2) Compute min/max for normalization
    double minVal = data.front().value, maxVal = data.front().value;
    int64_t minTime = data.front().timestamp, maxTime = data.front().timestamp;
    for (auto& dp : data) {
        if (dp.value < minVal) minVal = dp.value;
        if (dp.value > maxVal) maxVal = dp.value;
        if (dp.timestamp < minTime) minTime = dp.timestamp;
        if (dp.timestamp > maxTime) maxTime = dp.timestamp;
    }
    double timeRange = static_cast<double>(maxTime - minTime);
    double valRange  = maxVal - minVal;

    // 3) Fill vertices
    for (auto& dp : data) {
        float x = timeRange > 0
            ? static_cast<float>(((dp.timestamp - minTime) / timeRange) * 2.0 - 1.0)
            : 0.0f;
        float y = valRange > 0
            ? static_cast<float>(((dp.value - minVal) / valRange) * 2.0 - 1.0)
            : 0.0f;
        cmd.vertices.push_back(x);
        cmd.vertices.push_back(y);
    }

    commands.push_back(std::move(cmd));
    return commands;
}
