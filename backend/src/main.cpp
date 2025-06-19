#include <iostream>
#include <fstream>
#include <sstream>
#include "Protocol.hpp"

int main() {
    std::ifstream inputFile("data/sample_data.json");
    if (!inputFile.is_open()) {
        std::cerr << "[main] Failed to open sample_data.json\n";
        return 1;
    }

    // Parse first line as chart type
    std::string chartType;
    std::getline(inputFile, chartType);
    if (chartType.empty()) {
        std::cerr << "[main] No chart type specified in sample_data.json\n";
        return 1;
    }

    // Remaining file = JSON array
    std::stringstream buffer;
    buffer << inputFile.rdbuf();

    std::string jsonPayload = buffer.str();
    std::string result = Protocol::processRequest(chartType, jsonPayload);

    std::cout << "[main] Response:\n" << result << "\n";
    return 0;
}
