#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <boost/asio/strand.hpp>
#include <boost/asio/signal_set.hpp>
#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include "Protocol.hpp" // Your RapidJSON-based drawSeries

namespace beast     = boost::beast;         // from <boost/beast.hpp>
namespace http      = beast::http;          // from <boost/beast/http.hpp>
namespace websocket = beast::websocket;     // from <boost/beast/websocket.hpp>
namespace net       = boost::asio;          // from <boost/asio.hpp>
using tcp           = boost::asio::ip::tcp; // from <boost/asio/ip/tcp.hpp>

//------------------------------------------------------------------------------

void do_session(tcp::socket socket) {
    try {
        // Construct the WebSocket stream around the socket
        websocket::stream<tcp::socket> ws{std::move(socket)};

        // Accept the WebSocket handshake
        ws.accept();

        std::cout << "[Boost.Beast] Client connected\n";

        // Create and send a single drawSeries message
        DrawSeriesCommand cmd;
        cmd.type = "drawSeries";
        cmd.pane = "pricePane";
        cmd.seriesId = "price";
        cmd.style = { "line", "#22ff88", "", "", 2 };
        for (int i = 0; i < 60; ++i) {
            float t = i / 59.0f;
            float v = 0.5f + 0.5f * std::sin(2.0f * 3.14159f * t);
            float xNorm = t * 2.0f - 1.0f;
            float yNorm = v * 2.0f - 1.0f;
            cmd.vertices.push_back(xNorm);
            cmd.vertices.push_back(yNorm);
        }
        std::string message = cmd.toJsonString();
        ws.write(net::buffer(message));

        // Read messages in a loop (echoing them back or just logging)
        for (;;) {
            beast::flat_buffer buffer;
            ws.read(buffer);
            std::string received = beast::buffers_to_string(buffer.data());
            std::cout << "[Boost.Beast] Received: " << received << "\n";
            // (Optionally, echo back:)
            // ws.text(ws.got_text());
            // ws.write(buffer.data());
        }

    } catch (beast::system_error const& se) {
        // This indicates that the session was closed
        std::cerr << "[Boost.Beast] WebSocket closed: " << se.code().message() << "\n";
    } catch (std::exception const& e) {
        std::cerr << "[Boost.Beast] Exception: " << e.what() << "\n";
    }
}

//------------------------------------------------------------------------------

int main(int argc, char* argv[]) {
    try {
        auto const address = net::ip::make_address("0.0.0.0");
        unsigned short port = 9001;

        net::io_context ioc{1};

        // Capture SIGINT and SIGTERM to allow a clean shutdown
        net::signal_set signals(ioc, SIGINT, SIGTERM);
        signals.async_wait([&](auto, auto){ ioc.stop(); });

        tcp::acceptor acceptor{ioc, {address, port}};
        std::cout << "[Boost.Beast] Listening on port " << port << "\n";

        for (;;) {
            tcp::socket socket{ioc};
            acceptor.accept(socket);
            std::thread{std::bind(&do_session, std::move(socket))}.detach();
        }

    } catch (std::exception const& e) {
        std::cerr << "[Boost.Beast] Fatal error: " << e.what() << "\n";
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}