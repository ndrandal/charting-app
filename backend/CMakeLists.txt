cmake_minimum_required(VERSION 3.15)
project(chart_backend LANGUAGES CXX)

# -----------------------------------------------------------------------------------
# 1. C++ Version & Strictness
# -----------------------------------------------------------------------------------
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# -----------------------------------------------------------------------------------
# 2. Project Layout & Includes
# -----------------------------------------------------------------------------------
include_directories(${CMAKE_SOURCE_DIR}/include)          # your own headers
include_directories(${CMAKE_SOURCE_DIR}/include/rapidjson) # RapidJSON headers

# Verify RapidJSON is present
if(NOT EXISTS "${CMAKE_SOURCE_DIR}/include/rapidjson/document.h")
  message(FATAL_ERROR "RapidJSON headers not found under include/rapidjson")
endif()

# -----------------------------------------------------------------------------------
# 3. Find Boost (Beast uses Boost.System and Boost.Asio)
# -----------------------------------------------------------------------------------
find_package(Boost REQUIRED COMPONENTS system)

if(NOT Boost_FOUND)
  message(FATAL_ERROR "Boost not found. Please install Boost (system, asio).")
endif()

message(STATUS "Boost include dirs: ${Boost_INCLUDE_DIRS}")
include_directories(${Boost_INCLUDE_DIRS})

# -----------------------------------------------------------------------------------
# 4. Source Files
# -----------------------------------------------------------------------------------
# Collect all .cpp in src/
file(GLOB_RECURSE BACKEND_SOURCES
    ${CMAKE_SOURCE_DIR}/src/*.cpp
)

# -----------------------------------------------------------------------------------
# 5. Create Executable Target
# -----------------------------------------------------------------------------------
add_executable(chart_server ${BACKEND_SOURCES})

# -----------------------------------------------------------------------------------
# 6. Link Libraries
# -----------------------------------------------------------------------------------
# Boost.Beast is header-only, but we need Boost.System for error codes and Asio.
target_link_libraries(chart_server PRIVATE Boost::system)

# -----------------------------------------------------------------------------------
# 7. Threads (Asio may need it)
# -----------------------------------------------------------------------------------
find_package(Threads REQUIRED)
target_link_libraries(chart_server PRIVATE Threads::Threads)

# -----------------------------------------------------------------------------------
# 8. Summary
# -----------------------------------------------------------------------------------
message(STATUS "Backend executable: chart_server")
message(STATUS "Source files: ${BACKEND_SOURCES}")
message(STATUS "Using RapidJSON headers from: ${CMAKE_SOURCE_DIR}/include/rapidjson")
message(STATUS "Linking with Boost.System for Beast WebSockets")
