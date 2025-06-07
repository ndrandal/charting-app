// backend/src/RenderEngine.cpp

#include "RenderEngine.hpp"
#include <fstream>
#include <sstream>
#include <rapidjson/document.h>
#include <iostream>

std::vector<DataPoint> RenderEngine::loadData(const std::string& filePath) {
    std::ifstream ifs(filePath);
    if (!ifs.is_open()) {
        std::cerr << "[RenderEngine] Cannot open " << filePath << std::endl;
        return {};
    }
    std::stringstream buf; buf << ifs.rdbuf();
    rapidjson::Document doc;
    doc.Parse(buf.str().c_str());
    if (!doc.IsArray()) {
        std::cerr << "[RenderEngine] Expected JSON array in " << filePath << std::endl;
        return {};
    }

    std::vector<DataPoint> out;
    for (auto& v : doc.GetArray()) {
        DataPoint dp{};
        dp.timestamp = v["timestamp"].GetInt64();
        dp.value     = v["value"].GetDouble();
        out.push_back(dp);
    }
    return out;
}

std::vector<DrawCommand> RenderEngine::generateDrawCommands(const std::vector<DataPoint>& data) const {
    std::vector<DrawCommand> cmds;
    if (data.empty()) return cmds;

    // 1) compute ranges
    int64_t minT = data.front().timestamp, maxT = minT;
    double  minV = data.front().value,     maxV = minV;
    for (auto& dp : data) {
        if (dp.timestamp < minT) minT = dp.timestamp;
        if (dp.timestamp > maxT) maxT = dp.timestamp;
        if (dp.value     < minV) minV = dp.value;
        if (dp.value     > maxV) maxV = dp.value;
    }
    double tRange = double(maxT - minT);
    double vRange = maxV - minV;

    // 2) axes: bottom border (x-axis)
    DrawCommand xAxis;
    xAxis.type       = "axis";
    xAxis.pane       = "main";
    xAxis.style.color     = "#ffffff";
    xAxis.style.thickness = 1;
    xAxis.vertices  = { -1.0f, -1.0f,  1.0f, -1.0f };
    cmds.push_back(xAxis);

    // 3) axes: left border (y-axis)
    DrawCommand yAxis;
    yAxis.type       = "axis";
    yAxis.pane       = "main";
    yAxis.style.color     = "#ffffff";
    yAxis.style.thickness = 1;
    yAxis.vertices  = { -1.0f, -1.0f, -1.0f,  1.0f };
    cmds.push_back(yAxis);

    // 4) line series
    DrawCommand lineCmd;
    lineCmd.type       = "drawSeries";
    lineCmd.pane       = "main";
    lineCmd.style.color     = "#00ff00";
    lineCmd.style.thickness = 2;
    lineCmd.vertices.reserve(data.size()*2);

    for (auto& dp : data) {
        float x = tRange > 0
          ? float(((dp.timestamp - minT) / tRange) * 2.0 - 1.0)
          : 0.0f;
        float y = vRange > 0
          ? float(((dp.value     - minV) / vRange) * 2.0 - 1.0)
          : 0.0f;
        lineCmd.vertices.push_back(x);
        lineCmd.vertices.push_back(y);
    }
    cmds.push_back(std::move(lineCmd));

    return cmds;
}
