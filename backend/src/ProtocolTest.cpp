// backend/src/ProtocolTest.cpp
#include <iostream>
#include "Protocol.hpp"

int main() {
    DrawSeriesCommand cmd;
    cmd.type = "drawSeries";
    cmd.pane = "testPane";
    cmd.seriesId = "test";
    cmd.style = { "line", "#ffffff", "", "", 1 };
    cmd.vertices = {0.0f, 0.0f, 1.0f, 1.0f};

    std::string json = cmd.toJsonString();
    std::cout << json << std::endl;
    return 0;
}
