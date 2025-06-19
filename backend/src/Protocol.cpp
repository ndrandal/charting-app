// backend/src/Protocol.cpp

#include "Protocol.hpp"
#include "RenderEngine.hpp"
#include "DrawCommand.hpp"

#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>

#include <string>

std::string Protocol::processRequest(
    const std::string& chartType,
    const std::string& jsonArrayStr
) {
    using namespace rapidjson;

    // Parse client request (chartType + data payload handled in main)
    // Here we only wrap RenderEngine calls in an error envelope.

    // Delegate payload parsing to RenderEngine
    // Pass chartType and raw JSON array string
    // RenderEngine returns either a vector of DrawCommand or empty on error/unknown type

    // We will capture all errors and return JSON with { type:"error", message:"..." }
    // On success, return { type:"drawCommands", commands: [...] }

    // First, defer to RenderEngine: but it currently works only on valid arrays,
    // so we trust it returns empty vector on parse or logic errors.
    auto commands = ChartingApp::RenderEngine::generateDrawCommands(chartType, jsonArrayStr);

    // If empty and no commands, decide if it's an error or simply no data.
    // For simplicity, treat empty commands as valid (no data) rather than an error.
    // Construct the batch envelope:

    Document resp(kObjectType);
    auto& alloc = resp.GetAllocator();
    resp.AddMember("type", "drawCommands", alloc);

    Value arr(kArrayType);
    for (const auto& cmd : commands) {
        Value obj(kObjectType);
        // Basic fields
        obj.AddMember("type",
                      Value(cmd.type.c_str(), alloc),
                      alloc);
        obj.AddMember("label",
                      Value(cmd.label.c_str(), alloc),
                      alloc);
        obj.AddMember("pane",
                      Value(cmd.pane.c_str(), alloc),
                      alloc);
        obj.AddMember("seriesId",
                      Value(cmd.seriesId.c_str(), alloc),
                      alloc);
        // Vertices
        Value verts(kArrayType);
        for (float v : cmd.vertices) {
            verts.PushBack(v, alloc);
        }
        obj.AddMember("vertices", verts, alloc);
        // Style
        Value styleObj(kObjectType);
        styleObj.AddMember("color",
                           Value(cmd.style.color.c_str(), alloc),
                           alloc);
        styleObj.AddMember("altColor",
                           Value(cmd.style.altColor.c_str(), alloc),
                           alloc);
        styleObj.AddMember("wickColor",
                           Value(cmd.style.wickColor.c_str(), alloc),
                           alloc);
        styleObj.AddMember("thickness",
                           cmd.style.thickness,
                           alloc);
        obj.AddMember("style", styleObj, alloc);

        arr.PushBack(obj, alloc);
    }
    resp.AddMember("commands", arr, alloc);

    StringBuffer buf;
    Writer<StringBuffer> writer(buf);
    resp.Accept(writer);
    return buf.GetString();
}
