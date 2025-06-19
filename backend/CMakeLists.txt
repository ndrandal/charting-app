cmake_minimum_required(VERSION 3.15)
project(chart_server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD        17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS       OFF)

find_package(Threads REQUIRED)

include_directories(
  "${CMAKE_SOURCE_DIR}/include"
  "${CMAKE_SOURCE_DIR}/include/generators"
  "C:/thirdparty/boost"
  "C:/thirdparty/asio/include"
  "C:/thirdparty"
)

file(GLOB GENERATOR_SRCS
  "${CMAKE_SOURCE_DIR}/src/generators/*.cpp"
)

add_executable(chart_server
  src/main.cpp
  src/RenderEngine.cpp
  ${GENERATOR_SRCS}
)

# Copy sample_data.json (and any other files in data/) into build/data/
add_custom_command(TARGET chart_server POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/../data
    ${CMAKE_BINARY_DIR}/data
)

target_compile_definitions(chart_server PRIVATE ASIO_STANDALONE BOOST_ALL_NO_LIB)
target_link_libraries(chart_server PRIVATE Threads::Threads)
