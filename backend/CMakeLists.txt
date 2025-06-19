cmake_minimum_required(VERSION 3.15)
project(chart_server LANGUAGES CXX)

# Use C++17
set(CMAKE_CXX_STANDARD        17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS       OFF)

# Find threading and Boost.System (for Beast)
find_package(Threads REQUIRED)
find_package(Boost REQUIRED COMPONENTS system)

# Include paths for your headers and Boost
include_directories(
  ${CMAKE_SOURCE_DIR}/include
  ${CMAKE_SOURCE_DIR}/include/generators
  ${Boost_INCLUDE_DIRS}
)

# Gather all chart-generator source files
file(GLOB GENERATOR_SRCS
  "${CMAKE_SOURCE_DIR}/src/generators/*.cpp"
)

# Main server executable
add_executable(chart_server
  src/main.cpp
  src/Protocol.cpp
  src/RenderEngine.cpp
  ${GENERATOR_SRCS}
)

# Define standalone Asio and disable Boost auto-linking
target_compile_definitions(chart_server
  PRIVATE
    ASIO_STANDALONE
    BOOST_ALL_NO_LIB
)

# After build, copy your data folder into the build directory so
# the server can load data/sample_data.json by default
add_custom_command(TARGET chart_server POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/../data
    ${CMAKE_BINARY_DIR}/data
)

# Link threading and Boost.System
target_link_libraries(chart_server
  PRIVATE
    Threads::Threads
    Boost::system
)
