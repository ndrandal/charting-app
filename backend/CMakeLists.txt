# ---------------------------------------------------------
# charting-app/backend/CMakeLists.txt
# ---------------------------------------------------------

cmake_minimum_required(VERSION 3.15)
project(chart_backend LANGUAGES CXX)

# ---------------------------------------------------------
# 1. C++ Standard
# ---------------------------------------------------------
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ---------------------------------------------------------
# 2. Project Headers & External Dependencies
# ---------------------------------------------------------

# 2.1. Your own headers (backend/include/)

include_directories(${CMAKE_SOURCE_DIR}/include)

file(GLOB_RECURSE BACKEND_SOURCES
  ${CMAKE_SOURCE_DIR}/src/*.cpp
)
add_executable(chart_server ${BACKEND_SOURCES})
target_link_libraries(chart_server PRIVATE Threads::Threads)


#
# 2.2. RapidJSON (header-only)
#    On disk you have:
#      C:/thirdparty/rapidjson/document.h
#      C:/thirdparty/rapidjson/reader.h
#      ... etc.
#
#    Thus, to support `#include <rapidjson/document.h>`,
#    we add C:/thirdparty to the include path. The compiler then does:
#      C:/thirdparty/rapidjson/document.h
#
#    If your files actually live in C:/thirdparty/rapidjson/include/rapidjson/,
#    set RAPIDJSON_ROOT accordingly (e.g., "C:/thirdparty/rapidjson/include").
#

set(RAPIDJSON_ROOT "C:/thirdparty")
if(NOT EXISTS "${RAPIDJSON_ROOT}/rapidjson/document.h")
    message(FATAL_ERROR
      "RapidJSON headers not found! Expected:\n"
      "  ${RAPIDJSON_ROOT}/rapidjson/document.h\n"
      "Adjust RAPIDJSON_ROOT if your folder structure is different."
    )
endif()

include_directories(${RAPIDJSON_ROOT})

#
# 2.3. WebSocket++ (header-only)
#    On disk you have:
#      C:/thirdparty/websocketpp/config/asio_no_tls.hpp
#      C:/thirdparty/websocketpp/server.hpp
#      ... (other WebSocket++ headers directly under C:/thirdparty/websocketpp/)
#
#    WebSocket++ code always does `#include <websocketpp/...>`, so we must add
#    C:/thirdparty to the include path so that:
#      <websocketpp/config/asio_no_tls.hpp> → C:/thirdparty/websocketpp/config/asio_no_tls.hpp
#      <websocketpp/server.hpp>            → C:/thirdparty/websocketpp/server.hpp
#

set(WEBSOCKETPP_ROOT "C:/thirdparty")
if(NOT EXISTS "${WEBSOCKETPP_ROOT}/websocketpp/config/asio_no_tls.hpp")
    message(FATAL_ERROR
      "WebSocket++ headers not found! Expected:\n"
      "  ${WEBSOCKETPP_ROOT}/websocketpp/config/asio_no_tls.hpp\n"
      "Adjust WEBSOCKETPP_ROOT if your folder is different."
    )
endif()

include_directories(${WEBSOCKETPP_ROOT})

#
# 2.4. Standalone Asio (header-only)
#    On disk you have:
#      C:/thirdparty/asio/include/asio.hpp
#      ... (other Asio subheaders under C:/thirdparty/asio/include/asio/)
#
#    We add C:/thirdparty/asio/include to the include path so that
#    `#include <asio.hpp>` resolves to C:/thirdparty/asio/include/asio.hpp
#

set(ASIO_ROOT "C:/thirdparty/asio/include")
if(NOT EXISTS "${ASIO_ROOT}/asio.hpp")
    message(FATAL_ERROR
      "Standalone Asio headers not found! Expected:\n"
      "  ${ASIO_ROOT}/asio.hpp\n"
      "Adjust ASIO_ROOT if your Asio is in a different subfolder."
    )
endif()

include_directories(${ASIO_ROOT})

# ---------------------------------------------------
# 2.5. Force WebSocket++ → standalone Asio
# ---------------------------------------------------
add_compile_definitions(
    ASIO_STANDALONE              # switch Asio over from Boost to standalone
    ASIO_NO_CO_AWAIT             # disable Asio's C++20 coroutine variadic code path
    _WEBSOCKETPP_CPP11_TYPE_TRAITS_   # force WebSocket++ to use <type_traits> instead of Boost
)
# ---------------------------------------------------------
# 3. Collect All .cpp Source Files
# ---------------------------------------------------------
file(GLOB_RECURSE BACKEND_SOURCES
    ${CMAKE_SOURCE_DIR}/src/*.cpp
)

# ---------------------------------------------------------
# 4. Create Executable Target
# ---------------------------------------------------------
add_executable(chart_server ${BACKEND_SOURCES})

# ---------------------------------------------------------
# 5. Link Threads (Asio uses threads)
# ---------------------------------------------------------
find_package(Threads REQUIRED)
target_link_libraries(chart_server PRIVATE Threads::Threads)

# ---------------------------------------------------------
# 6. Status Messages (for debug)
# ---------------------------------------------------------
message(STATUS "-------------------------------------------")
message(STATUS "Backend executable:         chart_server")
message(STATUS "Source files:               ${BACKEND_SOURCES}")
message(STATUS "Using RapidJSON headers:    ${RAPIDJSON_ROOT}/rapidjson/document.h")
message(STATUS "Using WebSocket++ headers:  ${WEBSOCKETPP_ROOT}/websocketpp/config/asio_no_tls.hpp")
message(STATUS "Using standalone Asio:      ${ASIO_ROOT}/asio.hpp")
message(STATUS "Threads library:            ${CMAKE_THREAD_LIBS_INIT}")
message(STATUS "-------------------------------------------")
