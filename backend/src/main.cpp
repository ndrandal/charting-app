// charting-app-main/backend/src/main.cpp

#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <iostream>

#include "Protocol.hpp"       // your RapidJSON serialization helper
#include "RenderEngine.hpp"   // loadOhlcData + generateOhlcDrawCommands

namespace asio  = boost::asio;
namespace beast = boost::beast;
namespace ws    = beast::websocket;
using tcp       = asio::ip::tcp;

int main() {
  try {
    asio::io_context ioc{1};

    // 1) Precompute your JSON payload FOR CANDLESTICKS
    // Adjust path if needed: from `backend/src` → `../../data/sample_ohlc_data.json`
    auto ohlc = RenderEngine::loadOhlcData("../../data/sample_data.json");
    if (ohlc.empty()) {
      std::cerr << "[Main] ⚠️ No OHLC bars loaded! Check the JSON path.\n";
      return EXIT_FAILURE;
    }

    RenderEngine engine;
    auto cmds = engine.generateOhlcDrawCommands(ohlc);
    std::cerr << "[Main] 🔥 Generated " << cmds.size() << " candlestick commands\n";

    // Build the drawCommands batch
    rapidjson::Document doc;
    doc.SetObject();
    auto& alloc = doc.GetAllocator();

    doc.AddMember("type",
                  rapidjson::Value("drawCommands", alloc),
                  alloc);

    rapidjson::Value arr(rapidjson::kArrayType);
    for (auto& cmd : cmds) {
        rapidjson::Value obj(rapidjson::kObjectType);
        cmd.serialize(obj, alloc);
        arr.PushBack(obj, alloc);
    }
    doc.AddMember("commands", arr, alloc);

    rapidjson::StringBuffer sb;
    rapidjson::Writer<rapidjson::StringBuffer> writer(sb);
    doc.Accept(writer);
    std::string payload = sb.GetString();

    // 2) Set up WebSocket listener on port 9001
    tcp::acceptor acceptor{ioc, {tcp::v4(), 9001}};
    std::cout << "[Beast] Listening for WS on port 9001\n";

    for (;;) {
      tcp::socket socket = acceptor.accept();
      std::thread{[payload, sock = std::move(socket)]() mutable {
        try {
          ws::stream<tcp::socket> wsock{std::move(sock)};
          wsock.accept();                      // websocket handshake
          std::cerr << "[Beast] Client connected, sending candles\n";
          wsock.write(asio::buffer(payload));  // send candlestick batch

          // then just echo or idle
          for (;;) {
            beast::flat_buffer buffer;
            wsock.read(buffer);
          }
        } catch (std::exception &e) {
          std::cerr << "[Beast] Error: " << e.what() << "\n";
        }
      }}.detach();
    }
  } catch (std::exception &e) {
    std::cerr << "[Beast] Fatal: " << e.what() << "\n";
    return EXIT_FAILURE;
  }
}
