#ifndef SRC_EXPORT_H
#define SRC_EXPORT_H

#ifdef __EMSCRIPTEN__
#define WASM_EXPORT __attribute__((used))
#else
#define WASM_EXPORT __attribute__((visibility("default")))
#endif

#endif
