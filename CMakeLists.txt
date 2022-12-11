cmake_minimum_required(VERSION 3.13.0)

project(qrcodegen)

set(TARGET_NAME qrcodegen)

add_executable(${TARGET_NAME} "src/qrcodegen.c")
if(CMAKE_SYSTEM_NAME STREQUAL WASI)
  set_target_properties(${TARGET_NAME} PROPERTIES SUFFIX ".wasm")
  target_link_options(${TARGET_NAME} PRIVATE
    "-v"
    "-mexec-model=reactor"
    "-Wl,--initial-memory=16777216,--export-dynamic,--export=malloc,--export=free"
  )
  if(CMAKE_BUILD_TYPE STREQUAL "Release")
    target_link_options(${TARGET_NAME} PRIVATE "-Wl,--strip-debug")
  endif()
endif()
