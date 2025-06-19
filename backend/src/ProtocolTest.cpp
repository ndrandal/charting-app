#include "Protocol.hpp"
#include "generators/ChartGeneratorFactory.hpp"
#include "generators/LineChartGenerator.hpp"
#include "generators/CandleStickChartGenerator.hpp"
#include "DrawCommand.hpp"

#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>
#include <sstream>
#include <iostream>

std::string Protocol::processRequest(const std::string& chartType, const std::string& jsonArrayStr) {
    using namespace rapidjson;

    Document doc;
    doc.Parse(jsonArrayStr.c_str());

    if (!doc.IsArray()) {
        return R"({"error": "Input must be a JSON array"})";
    }

    auto generator = ChartGeneratorFactory::createGenerator(chartType);
    if (!generator) {
        return R"({"error": "Unknown chart type"})";
    }

    DrawCommand cmd;

    if (chartType == "line") {
        std::vector<DataPoint> data;
        for (const auto& v : doc.GetArray()) {
            if (!v.IsObject() || !v.HasMember("timestamp") || !v.HasMember("value")) continue;
            DataPoint pt;
            pt.timestamp = v["timestamp"].GetInt64();
            pt.value = v["value"].GetDouble();
            data.push_back(pt);
        }
        cmd = generator->generate("series", data);

    } else if (chartType == "candlestick") {
        std::vector<OhlcPoint> data;
        for (const auto& v : doc.GetArray()) {
            if (!v.IsObject() || !v.HasMember("timestamp")) continue;
            OhlcPoint pt;
            pt.timestamp = v["timestamp"].GetInt64();
            pt.open  = v["open"].GetDouble();
            pt.high  = v["high"].GetDouble();
            pt.low   = v["low"].GetDouble();
            pt.close = v["close"].GetDouble();
            data.push_back(pt);
        }
        cmd = generator->generate("ohlc", data);

    } else {
        return R"({"error": "Unhandled chart type"})";
    }

    // Serialize result
    StringBuffer buffer;
    Writer<StringBuffer> writer(buffer);
    writer.StartObject();
    writer.Key("type");
    writer.String(cmd.type.c_str());
    writer.Key("label");
    writer.String(cmd.label.c_str());
    writer.Key("values");
    writer.StartArray();
    for (const auto& val : cmd.values) {
        writer.Double(val);
    }
    writer.EndArray();
    writer.Key("timestamps");
    writer.StartArray();
    for (const auto& ts : cmd.timestamps) {
        writer.Int64(ts);
    }
    writer.EndArray();
    writer.EndObject();

    return buffer.GetString();
}
