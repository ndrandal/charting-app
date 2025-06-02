cmake_minimum_required(VERSION 3.1)
project(uWebSockets)

add_library(uWS STATIC
  src/App.cpp
  src/WebSocket.cpp
  src/HTTPSocket.cpp
  # … (all other .cpp in src/)
)

target_include_directories(uWS
  PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_compile_definitions(uWS PUBLIC
  # possible defines, e.g. UWS_NO_SSL if not using OpenSSL
)
