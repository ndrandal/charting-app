cmake_minimum_required(VERSION 3.15)
project(chart_backend LANGUAGES CXX)

# — Use C++20
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# — Include path for your headers (if you add any later)
include_directories(${CMAKE_SOURCE_DIR}/include)

# — Grab all .cpp files under src/
file(GLOB_RECURSE SOURCES
    ${CMAKE_SOURCE_DIR}/src/*.cpp
)

# — Build executable
add_executable(chart_server ${SOURCES})

# — (Later) link against a WebSocket library, e.g. uWebSockets or Boost.Beast
# target_link_libraries(chart_server PRIVATE uwebsockets)
