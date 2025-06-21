cmake_minimum_required(VERSION 3.15)

# — Respect CMake’s Boost policy so BOOST_ROOT is honored —
if(POLICY CMP0144)
  cmake_policy(SET CMP0144 NEW)
endif()

project(chart_server VERSION 1.0 LANGUAGES CXX)

# ————————————————————————————————————————————————————————————————
#  C++17
# ————————————————————————————————————————————————————————————————
set(CMAKE_CXX_STANDARD        17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS       OFF)

# ————————————————————————————————————————————————————————————————
#  Where to find your 3rd-party libraries?
#  Override on the command-line if yours lives elsewhere:
#     -DTHIRD_PARTY_DIR="D:/libs"
# ————————————————————————————————————————————————————————————————
set(THIRD_PARTY_DIR
    "C:/thirdparty"
    CACHE PATH "Root path for standalone Asio, Boost, etc.")

# ————————————————————————————————————————————————————————————————
#  BOOST (static, multithreaded)
# ————————————————————————————————————————————————————————————————
set(BOOST_ROOT        "${THIRD_PARTY_DIR}/boost_1_88_0" CACHE PATH "")
set(BOOST_INCLUDEDIR  "${BOOST_ROOT}"                  CACHE PATH "")
set(BOOST_LIBRARYDIR  "${BOOST_ROOT}/stage/lib"        CACHE PATH "")

# Look for the “libboost_…” static libs on Windows
set(Boost_USE_STATIC_LIBS   ON  CACHE BOOL "")
set(Boost_USE_MULTITHREADED ON)

find_package(Boost 1.78 REQUIRED COMPONENTS system)
if(NOT Boost_FOUND)
  message(FATAL_ERROR
    "Could NOT find Boost.System!\n"
    "  BOOST_ROOT        = ${BOOST_ROOT}\n"
    "  BOOST_LIBRARYDIR  = ${BOOST_LIBRARYDIR}\n"
    "Make sure you ran:\n"
    "  b2 --with-system address-model=64 variant=release stage")
endif()

# ————————————————————————————————————————————————————————————————
#  Asio (standalone headers)
# ————————————————————————————————————————————————————————————————
find_path(ASIO_INCLUDE_DIR
  NAMES asio.hpp
  HINTS "${THIRD_PARTY_DIR}/asio/include")
if(NOT ASIO_INCLUDE_DIR)
  message(FATAL_ERROR
    "Could NOT find standalone Asio headers!\n"
    "  Expected to find asio.hpp under: ${THIRD_PARTY_DIR}/asio/include")
endif()

# ————————————————————————————————————————————————————————————————
#  Threads
# ————————————————————————————————————————————————————————————————
find_package(Threads REQUIRED)

# ————————————————————————————————————————————————————————————————
#  Sources
# ————————————————————————————————————————————————————————————————
file(GLOB GENERATOR_SRCS
     "${CMAKE_SOURCE_DIR}/src/generators/*.cpp")

add_executable(chart_server
  src/main.cpp
  src/Protocol.cpp
  src/RenderEngine.cpp
  ${GENERATOR_SRCS}
)

# ————————————————————————————————————————————————————————————————
#  Includes & compile‐time defines
# ————————————————————————————————————————————————————————————————
target_include_directories(chart_server PRIVATE
  ${CMAKE_SOURCE_DIR}/include
  ${CMAKE_SOURCE_DIR}/include/generators
  ${Boost_INCLUDE_DIRS}
  ${ASIO_INCLUDE_DIR}
)

target_compile_definitions(chart_server PRIVATE
  ASIO_STANDALONE
  BOOST_ALL_NO_LIB
)

# ————————————————————————————————————————————————————————————————
#  Link libraries
# ————————————————————————————————————————————————————————————————
target_link_libraries(chart_server PRIVATE
  Threads::Threads
  Boost::system
)

# ————————————————————————————————————————————————————————————————
#  Post‐build: copy data folder next to the exe
# ————————————————————————————————————————————————————————————————
add_custom_command(TARGET chart_server POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory
    ${CMAKE_SOURCE_DIR}/../data
    ${CMAKE_BINARY_DIR}/data
)
