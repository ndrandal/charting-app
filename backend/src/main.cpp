// backend/src/main.cpp

#include <cstdlib>              // std::getenv, std::atoi
#include <fstream>              // std::ifstream
#include <iostream>             // std::cout, std::cerr
#include <string>
#include <thread>

#include "Protocol.hpp"         // your Protocol::processRequest
#include "RenderEngine.hpp"     // for data loading if you extend server logic

// Boost.Beast / Asio
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <rapidjson/document.h> // for parsing subscribe/unsubscribe

namespace beast     = boost::beast;
namespace websocket = beast::websocket;
namespace net       = boost::asio;
using     tcp       = net::ip::tcp;

static std::string getEnvOr(const char* var, const char* def) {
    const char* val = std::getenv(var);
    return val ? val : def;
}

// Handle one WebSocket session on its own thread
void do_session(tcp::socket socket) {
    try {
        websocket::stream<tcp::socket> ws(std::move(socket));
        ws.accept();  // complete handshake

        for (;;) {
            // Read a text frame
            beast::flat_buffer buffer;
            ws.read(buffer);
            std::string msg = beast::buffers_to_string(buffer.data());

            // Parse as JSON 
            rapidjson::Document req;
            req.Parse(msg.c_str());
            if (req.HasParseError() || !req.IsObject() ||
                !req.HasMember("type") || !req["type"].IsString()) {
                const char* err = R"({"type":"error","message":"Invalid JSON request"})";
                ws.write(net::buffer(err));
                continue;
            }

            std::string reqType = req["type"].GetString();
            if (reqType == "subscribe") {
                if (reqType == "subscribe") {
                // Collect requested series types (string or array)
                std::vector<std::string> types;
                auto& alloc = req.GetAllocator();

                if (req.HasMember("seriesTypes") && req["seriesTypes"].IsArray()) {
                    for (auto& v : req["seriesTypes"].GetArray()) {
                        if (v.IsString())
                            types.emplace_back(v.GetString());
                    }
                } else if (req.HasMember("seriesType") && req["seriesType"].IsString()) {
                    types.emplace_back(req["seriesType"].GetString());
                } else {
                    const char* err = R"({"type":"error","message":"Missing 'seriesType(s)' field"})";
                    ws.write(net::buffer(err));
                    continue;
                }

                // Load the same JSON array from disk once
                std::string dataFile = getEnvOr("DATA_FILE_PATH", "data/sample_data.json");
                std::ifstream ifs(dataFile);
                if (!ifs.is_open()) {
                    const char* err = R"({"type":"error","message":"Cannot open data file"})";
                    ws.write(net::buffer(err));
                    continue;
                }
                std::string jsonArray((std::istreambuf_iterator<char>(ifs)),
                                      std::istreambuf_iterator<char>());

                // For each requested series, generate commands and collect
                std::vector<ChartingApp::DrawCommand> allCmds;
                for (auto& st : types) {
                    auto cmds = ChartingApp::RenderEngine::generateDrawCommands(st, jsonArray);
                    allCmds.insert(allCmds.end(), cmds.begin(), cmds.end());
                }

                // Build one batch envelope with ALL commands
                rapidjson::Document resp(rapidjson::kObjectType);
                auto& ralloc = resp.GetAllocator();
                resp.AddMember("type", "drawCommands", ralloc);

                rapidjson::Value arr(rapidjson::kArrayType);
                for (auto& cmd : allCmds) {
                    rapidjson::Value obj(rapidjson::kObjectType);
                    obj.AddMember("type", rapidjson::Value(cmd.type.c_str(), ralloc), ralloc);
                    obj.AddMember("label", rapidjson::Value(cmd.label.c_str(), ralloc), ralloc);
                    obj.AddMember("pane", rapidjson::Value(cmd.pane.c_str(), ralloc), ralloc);
                    obj.AddMember("seriesId", rapidjson::Value(cmd.seriesId.c_str(), ralloc), ralloc);

                    // vertices
                    rapidjson::Value verts(rapidjson::kArrayType);
                    for (float v : cmd.vertices) verts.PushBack(v, ralloc);
                    obj.AddMember("vertices", verts, ralloc);

                    // style
                    rapidjson::Value styleObj(rapidjson::kObjectType);
                    styleObj.AddMember("color", rapidjson::Value(cmd.style.color.c_str(), ralloc), ralloc);
                    styleObj.AddMember("altColor", rapidjson::Value(cmd.style.altColor.c_str(), ralloc), ralloc);
                    styleObj.AddMember("wickColor", rapidjson::Value(cmd.style.wickColor.c_str(), ralloc), ralloc);
                    styleObj.AddMember("thickness", cmd.style.thickness, ralloc);
                    obj.AddMember("style", styleObj, ralloc);

                    arr.PushBack(obj, ralloc);
                }
                resp.AddMember("commands", arr, ralloc);

                rapidjson::StringBuffer sb;
                rapidjson::Writer<rapidjson::StringBuffer> writer(sb);
                resp.Accept(writer);
                ws.write(net::buffer(sb.GetString()));
            } else if (reqType == "unsubscribe") {
                // Graceful close
                ws.close(websocket::close_code::normal);
                break;

            } else {
                const char* err = R"({"type":"error","message":"Unknown request type"})";
                ws.write(net::buffer(err));
            }
        }

    } catch (std::exception const& e) {
        std::cerr << "[WebSocket] Session error: " << e.what() << "\n";
    }
}

int main() {
    try {
        // Pull port from env or default to 9001
        unsigned short port = static_cast<unsigned short>(
            std::atoi(getEnvOr("BACKEND_PORT", "9001").c_str())
        );

        net::io_context ioc{1};
        auto address = net::ip::make_address("0.0.0.0");
        tcp::acceptor acceptor{ioc, {address, port}};

        std::cout << "[main] WebSocket server listening on 0.0.0.0:" << port << "\n";

        // Accept loop
        for (;;) {
            tcp::socket socket{ioc};
            acceptor.accept(socket);
            // Detach each session on its own thread
            std::thread(&do_session, std::move(socket)).detach();
        }

    } catch (std::exception const& e) {
        std::cerr << "[main] Fatal error: " << e.what() << "\n";
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
