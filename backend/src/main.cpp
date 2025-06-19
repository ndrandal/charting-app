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
                if (!req.HasMember("seriesType") || !req["seriesType"].IsString()) {
                    const char* err = R"({"type":"error","message":"Missing 'seriesType'"})";
                    ws.write(net::buffer(err));
                    continue;
                }
                std::string seriesType = req["seriesType"].GetString();

                // Load the JSON array from disk
                // DATA_FILE_PATH can be set at compile time or via env
                std::string dataFile = getEnvOr("DATA_FILE_PATH", "data/sample_data.json");
                std::ifstream ifs(dataFile);
                if (!ifs.is_open()) {
                    const char* err = R"({"type":"error","message":"Cannot open data file"})";
                    ws.write(net::buffer(err));
                    continue;
                }
                std::string jsonArray((std::istreambuf_iterator<char>(ifs)),
                                      std::istreambuf_iterator<char>());

                // Delegate to Protocol (which wraps RenderEngine)
                std::string response = Protocol::processRequest(seriesType, jsonArray);
                ws.write(net::buffer(response));

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
