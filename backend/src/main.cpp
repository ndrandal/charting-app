// backend/src/main.cpp

// Tell WebSocket++ to use standalone Asio
#define ASIO_STANDALONE

#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

#include <iostream>
#include <string>
#include <thread>
#include "Protocol.hpp" // Your RapidJSON-based DrawSeriesCommand

using websocketpp::connection_hdl;
using Server = websocketpp::server<websocketpp::config::asio>;

/* … rest of your existing WebSocket++ server code … */

using websocketpp::connection_hdl;
using Server = websocketpp::server<websocketpp::config::asio>;

// ------------------------------------------------------------
// A simple WebSocket++ server that, upon each connection,
// sends a single drawSeries JSON message, then logs any
// incoming text frames. No TLS, no SSL (asio_no_tls).
// ------------------------------------------------------------

class ChartServer {
public:
    ChartServer(uint16_t port) : m_port(port) {
        // Initialize Asio
        m_server.init_asio();

        // Register handlers
        m_server.set_open_handler(std::bind(&ChartServer::on_open, this, std::placeholders::_1));
        m_server.set_message_handler(std::bind(&ChartServer::on_message, this, std::placeholders::_1, std::placeholders::_2));

        // Listen on the specified port
        m_server.listen(m_port);
        m_server.start_accept();

        std::cout << "[WebSocket++] Listening on port " << m_port << std::endl;
    }

    // Run the ASIO io_context loop
    void run() {
        m_server.run();
    }

private:
    // When a new client connects:
    void on_open(connection_hdl hdl) {
        std::cout << "[WebSocket++] Client connected" << std::endl;

        // Build a single drawSeries message
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

        std::string payload = cmd.toJsonString();

        // Send the JSON payload as a text message
        m_server.send(hdl, payload, websocketpp::frame::opcode::text);
    }

    // When we receive a message from a client:
    void on_message(connection_hdl hdl, Server::message_ptr msg) {
        std::string incoming = msg->get_payload();
        std::cout << "[WebSocket++] Received: " << incoming << std::endl;

        // (Optionally echo back)
        // m_server.send(hdl, incoming, websocketpp::frame::opcode::text);
    }

    Server m_server;
    uint16_t m_port;
};

int main() {
    try {
        constexpr uint16_t port = 9001;
        ChartServer server(port);
        server.run();
    } catch (const std::exception &e) {
        std::cerr << "[WebSocket++] Fatal error: " << e.what() << std::endl;
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
