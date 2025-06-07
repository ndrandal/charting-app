cmake_minimum_required(VERSION 3.15)
project(chart_server LANGUAGES CXX)

set(CMAKE_CXX_STANDARD        17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS       OFF)

find_package(Threads REQUIRED)

# Your own headers + Boost + (standalone) Asio + RapidJSON
include_directories(
  "${CMAKE_SOURCE_DIR}/include"
  "C:/thirdparty/boost"      # for <boost/beast.hpp>, <boost/asio.hpp>
  "C:/thirdparty/asio/include"     # if you want ASIO_STANDALONE instead
  "C:/thirdparty"        # for JSON
)

add_executable(chart_server
  src/main.cpp
  src/RenderEngine.cpp
)

# If you use standalone Asio:
target_compile_definitions(chart_server PRIVATE ASIO_STANDALONE BOOST_ALL_NO_LIB)

target_link_libraries(chart_server PRIVATE Threads::Threads)
