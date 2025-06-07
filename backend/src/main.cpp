// backend/src/main.cpp

#define ASIO_STANDALONE
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

#include <iostream>
#include "Protocol.hpp"
#include "RenderEngine.hpp"

using Server          = websocketpp::server<websocketpp::config::asio>;
using connection_hdl = websocketpp::connection_hdl;

class ChartServer {
public:
    ChartServer(uint16_t port) : m_port(port) {
        m_server.init_asio();
        m_server.set_open_handler(
            [this](connection_hdl hdl) { on_open(hdl); }
        );
        m_server.set_message_handler(
            [this](connection_hdl hdl, Server::message_ptr msg) { on_message(hdl, msg); }
        );
    }

    void run() {
        m_server.listen(m_port);
        m_server.start_accept();
        std::cout << "[ChartServer] Listening on port " << m_port << std::endl;
        m_server.run();
    }

private:
    void on_open(connection_hdl hdl) {
        std::cout << "[ChartServer] Client connected" << std::endl;
        // Load and render sample data
        auto data = RenderEngine::loadData("../../data/sample_data.json");
        RenderEngine engine;
        auto cmds = engine.generateLineChart(data);
        for (auto& cmd : cmds) {
            m_server.send(
              hdl,
              cmd.toJsonString(),
              websocketpp::frame::opcode::text
            );
        }
    }

    void on_message(connection_hdl, Server::message_ptr msg) {
        std::cout << "[ChartServer] Received: " << msg->get_payload() << std::endl;
    }

    Server     m_server;
    uint16_t   m_port;
};

int main() {
    try {
        ChartServer server(9001);
        server.run();
    } catch (const std::exception& e) {
        std::cerr << "[ChartServer] Fatal error: " << e.what() << std::endl;
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
