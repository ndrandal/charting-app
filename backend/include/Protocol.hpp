#pragma once

#include <string>
#include <vector>
#include <cstdint>

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

// Top-level Style struct (if you need it elsewhere)
struct Style {
    std::string type;      // "line" | "candlestick" | "histogram"
    std::string color;     // e.g. "#22ff88"
    float       thickness; // px
};

/// A single draw command (axis or series) sent to the frontend
struct DrawCommand {
    std::string        type;      // e.g. "axis" or "drawSeries"
    std::string        pane;      // e.g. "main"
    std::string        seriesId;  // e.g. "price", "ohlc"
    std::vector<float> vertices;  // [ x0, y0, x1, y1, … ]

    struct Style {
        std::string type;      // "line" | "candlestick"
        std::string color;     // CSS-style "#RRGGBB"
        int         thickness; // line thickness in pixels
    } style;

    /// Serialize this DrawCommand into a RapidJSON value
    void serialize(rapidjson::Value& val, rapidjson::Document::AllocatorType& alloc) const {
        val.SetObject();
        // command type
        val.AddMember("type",
                      rapidjson::Value(type.c_str(), alloc),
                      alloc);
        // pane
        val.AddMember("pane",
                      rapidjson::Value(pane.c_str(), alloc),
                      alloc);
        // seriesId
        val.AddMember("seriesId",
                      rapidjson::Value(seriesId.c_str(), alloc),
                      alloc);
        // vertices array
        rapidjson::Value arr(rapidjson::kArrayType);
        for (float f : vertices) {
            arr.PushBack(f, alloc);
        }
        val.AddMember("vertices", arr, alloc);
        // style object
        rapidjson::Value st(rapidjson::kObjectType);
        st.AddMember("type",
                     rapidjson::Value(style.type.c_str(), alloc),
                     alloc);
        st.AddMember("color",
                     rapidjson::Value(style.color.c_str(), alloc),
                     alloc);
        st.AddMember("thickness",
                     style.thickness,
                     alloc);
        val.AddMember("style", st, alloc);
    }
};
