#ifndef PROTOCOL_HPP
#define PROTOCOL_HPP

#include <string>

class Protocol {
public:
    // Accepts chartType and raw JSON array string, returns DrawCommand or error JSON
    static std::string processRequest(const std::string& chartType, const std::string& jsonArrayStr);
};

#endif // PROTOCOL_HPP
