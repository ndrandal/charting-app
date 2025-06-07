// src/main.cpp

#include <boost/asio.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/json.hpp>           // or include RapidJSON if you prefer
#include <iostream>
#include "Protocol.hpp"             // your rapidjson serialization
#include "RenderEngine.hpp"

namespace asio  = boost::asio;
namespace beast = boost::beast;
namespace ws    = beast::websocket;
using tcp       = asio::ip::tcp;

int main() {
  try {
    asio::io_context ioc{1};

    // 1) Precompute your JSON payload
    auto data = RenderEngine::loadData("../../data/sample_data.json");
    RenderEngine engine;
    auto cmds = engine.generateDrawCommands(data);
    // Serialize with RapidJSON as before:
    std::string payload = ""/* your rapidjson batch.dump() */;

    // 2) Set up a listening socket
    tcp::acceptor acceptor{ioc, {tcp::v4(), 9001}};
    std::cout << "[Beast] Listening on port 9001\n";

    for (;;) {
      tcp::socket socket = acceptor.accept();
      std::thread{[payload, sock = std::move(socket)]() mutable {
        try {
          ws::stream<tcp::socket> wsock{std::move(sock)};
          wsock.accept();                           // websocket handshake
          wsock.write(asio::buffer(payload));       // send initial batch

          for (;;) {
            beast::flat_buffer buffer;
            wsock.read(buffer);                     // read client messages
            // Optionally parse & respond...
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
