// backend/include/Protocol.hpp


#pragma once

#include <string>
#include <vector>
#include <cstdint>

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>
// Style struct for series rendering
struct Style {
    std::string type;      // "line"|"candlestick"|"histogram"
    std::string color;     // e.g. "#22ff88"
    std::string upColor;   // for candlesticks
    std::string downColor; // for candlesticks
    int thickness;
};

struct DrawSeriesCommand {
    std::string type;       // "drawSeries"
    std::string pane;       // e.g. "pricePane"
    std::string seriesId;   // e.g. "price"
    Style style;
    std::vector<float> vertices; // [x0, y0, x1, y1, ...]

    // Serialize to JSON string using RapidJSON
    std::string toJsonString() const {
        rapidjson::Document doc;
        doc.SetObject();
        auto& allocator = doc.GetAllocator();

        doc.AddMember("type", rapidjson::Value(type.c_str(), allocator), allocator);
        doc.AddMember("pane", rapidjson::Value(pane.c_str(), allocator), allocator);
        doc.AddMember("seriesId", rapidjson::Value(seriesId.c_str(), allocator), allocator);

        rapidjson::Value styleObj(rapidjson::kObjectType);
        styleObj.AddMember("type", rapidjson::Value(style.type.c_str(), allocator), allocator);
        if (!style.color.empty()) {
            styleObj.AddMember("color", rapidjson::Value(style.color.c_str(), allocator), allocator);
        }
        if (!style.upColor.empty()) {
            styleObj.AddMember("upColor", rapidjson::Value(style.upColor.c_str(), allocator), allocator);
        }
        if (!style.downColor.empty()) {
            styleObj.AddMember("downColor", rapidjson::Value(style.downColor.c_str(), allocator), allocator);
        }
        styleObj.AddMember("thickness", style.thickness, allocator);
        doc.AddMember("style", styleObj, allocator);

        rapidjson::Value vertArr(rapidjson::kArrayType);
        for (float v : vertices) {
            vertArr.PushBack(v, allocator);
        }
        doc.AddMember("vertices", vertArr, allocator);

        rapidjson::StringBuffer buffer;
        rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
        doc.Accept(writer);

        return buffer.GetString();
    }
    
};


struct DrawCommand {
    std::string       type;      // e.g. "axis" or "drawSeries"
    std::string       pane;      // e.g. "main"
    std::vector<float> vertices; // [ x0, y0, x1, y1, … ]
    struct Style {
        std::string color;       // CSS‐style "#RRGGBB"
        int         thickness;   // line thickness in pixels
    } style;

    /// Serialize this DrawCommand into `val` using RapidJSON,
    /// with allocator `alloc`.
    void serialize(rapidjson::Value& val, rapidjson::Document::AllocatorType& alloc) const {
        val.SetObject();
        // type
        val.AddMember("type",
                      rapidjson::Value(type.c_str(), alloc),
                      alloc);
        // pane
        val.AddMember("pane",
                      rapidjson::Value(pane.c_str(), alloc),
                      alloc);
        // vertices
        rapidjson::Value arr(rapidjson::kArrayType);
        for (float f : vertices) {
            arr.PushBack(f, alloc);
        }
        val.AddMember("vertices", arr, alloc);
        // style
        rapidjson::Value st(rapidjson::kObjectType);
        st.AddMember("color",
                     rapidjson::Value(style.color.c_str(), alloc),
                     alloc);
        st.AddMember("thickness",
                     style.thickness,
                     alloc);
        val.AddMember("style", st, alloc);
    }
};
