// backend/src/main.cpp

#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <rapidjson/document.h>
#include <rapidjson/writer.h>
#include <rapidjson/stringbuffer.h>
#include <iostream>
#include <thread>
#include <atomic>

#include "Protocol.hpp"      // DrawCommand + serialize(val, alloc)
#include "RenderEngine.hpp"  // loadData(), loadOhlcData(), generateDrawCommands(), generateOhlcDrawCommands()

namespace asio  = boost::asio;
namespace beast = boost::beast;
namespace ws    = beast::websocket;
using tcp       = asio::ip::tcp;

int main() {
    try {
        asio::io_context ioc{1};
        tcp::acceptor acceptor{
            ioc,
            { asio::ip::make_address("0.0.0.0"), 9001 }
        };
        std::cout << "[Server] Listening on ws://0.0.0.0:9001\n";

        while (true) {
            // 1) Accept a new connection
            tcp::socket sock = acceptor.accept();

            // 2) Handle it on its own thread
            std::thread{[sock = std::move(sock)]() mutable {
                try {
                    ws::stream<tcp::socket> wsock{std::move(sock)};
                    wsock.accept();
                    std::cout << "[Server] Client connected\n";

                    // 3) Load both datasets once
                    auto lineData = RenderEngine::loadData("../../data/sample_data.json");
                    auto ohlcData = RenderEngine::loadOhlcData("../../data/sample_ohlc.json");
                    std::cout << "[Server] Loaded " 
                              << lineData.size() << " line points, "
                              << ohlcData.size() << " OHLC bars\n";

                    RenderEngine engine;
                    std::atomic<bool> subscribed{false};
                    std::string desiredStyle = "line";

                    // Helper to build & send a drawCommands packet
                    auto sendBatch = [&](const std::vector<DrawCommand>& cmds) {
                        std::cout << "[Server] Sending batch of " << cmds.size() << " commands\n";
                        rapidjson::Document outDoc;
                        outDoc.SetObject();
                        auto& alloc = outDoc.GetAllocator();
                        outDoc.AddMember("type",
                                         rapidjson::Value("drawCommands", alloc),
                                         alloc);

                        rapidjson::Value arr(rapidjson::kArrayType);
                        for (auto& cmd : cmds) {
                            rapidjson::Value v(rapidjson::kObjectType);
                            cmd.serialize(v, alloc);
                            arr.PushBack(v, alloc);
                        }
                        outDoc.AddMember("commands", arr, alloc);

                        rapidjson::StringBuffer sb;
                        rapidjson::Writer<rapidjson::StringBuffer> writer(sb);
                        outDoc.Accept(writer);

                        const char* cstr = sb.GetString();
                        size_t len = sb.GetSize();

                        wsock.text(true);
                        wsock.write(asio::buffer(cstr, len));
                    };

                    // 4) Read-loop: subscribe / unsubscribe
                    for (;;) {
                        beast::flat_buffer buf;
                        wsock.read(buf);  // throws on disconnect
                        std::string msg = beast::buffers_to_string(buf.data());
                        std::cout << "[Server] Received: " << msg << "\n";

                        rapidjson::Document doc;
                        doc.Parse(msg.c_str());
                        if (!doc.IsObject() || !doc.HasMember("type")) 
                            continue;

                        std::string t = doc["type"].GetString();
                        if (t == "subscribe" && !subscribed.load()) {
                            // capture requested style
                            if (doc.HasMember("seriesType") && doc["seriesType"].IsString()) {
                                desiredStyle = doc["seriesType"].GetString();
                            }
                            subscribed = true;
                            std::cout << "[Server] Subscribed as '" 
                                      << desiredStyle << "'\n";

                            // send initial batch immediately
                            if (desiredStyle == "line") {
                                auto cmds = engine.generateDrawCommands(lineData);
                                sendBatch(cmds);
                            } else {
                                auto cmds = engine.generateOhlcDrawCommands(ohlcData);
                                sendBatch(cmds);
                            }

                            // detach thread for periodic updates
                            std::thread([&]() {
                                while (subscribed.load()) {
                                    std::this_thread::sleep_for(std::chrono::seconds(10));
                                    if (desiredStyle == "line") {
                                        auto cmds = engine.generateDrawCommands(lineData);
                                        sendBatch(cmds);
                                    } else {
                                        auto cmds = engine.generateOhlcDrawCommands(ohlcData);
                                        sendBatch(cmds);
                                    }
                                }
                                std::cout << "[Server] Stopped periodic updates\n";
                            }).detach();

                        } else if (t == "unsubscribe" && subscribed.load()) {
                            subscribed = false;
                            std::cout << "[Server] Unsubscribed\n";
                        }
                    }

                } catch (const beast::system_error& se) {
                    std::cerr << "[Connection] Closed or error: " 
                              << se.code().message() << "\n";
                } catch (const std::exception& e) {
                    std::cerr << "[Connection] Exception: " 
                              << e.what() << "\n";
                }
            }}.detach();
        }

    } catch (const std::exception& e) {
        std::cerr << "[Server] Fatal: " << e.what() << "\n";
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
