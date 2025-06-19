#ifndef DRAW_COMMAND_HPP
#define DRAW_COMMAND_HPP

#include <string>
#include <vector>
#include <cstdint>

struct DrawCommand {
    std::string type;
    std::string label;
    std::vector<double> values;
    std::vector<int64_t> timestamps;
};

#endif // DRAW_COMMAND_HPP
