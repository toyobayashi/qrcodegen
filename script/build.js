const { spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')

function main () {
  const buildDir = path.join(__dirname, '../build')
  const dist = path.join(__dirname, '../dist')
  fs.rmSync(buildDir, { recursive: true, force: true })
  fs.mkdirSync(buildDir, { recursive: true })
  fs.mkdirSync(dist, { recursive: true })
  const WASI_SDK_PATH = process.env.WASI_SDK_PATH.replace(/\\/g, '/')
  const toolchain = `${WASI_SDK_PATH}/share/cmake/wasi-sdk.cmake`
  const cmake = 'cmake' + (process.platform === 'win32' ? '.exe' : '')

  spawnSync(cmake, [
    `-DCMAKE_TOOLCHAIN_FILE=${toolchain}`,
    `-DWASI_SDK_PREFIX=${WASI_SDK_PATH}`,
    '-DCMAKE_VERBOSE_MAKEFILE=ON',
    '-DCMAKE_BUILD_TYPE=Release',
    '-H.',
    '-B', buildDir,
    '-GNinja'
  ], { cwd: path.join(__dirname, '..'), stdio: 'inherit' })

  spawnSync(cmake, [
    '--build', buildDir
  ], { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
  const wasm = path.join(buildDir, 'qrcodegen.wasm')
  fs.copyFileSync(wasm, path.join(dist, 'qrcodegen.wasm'))
  const wasmBase64 = fs.readFileSync(wasm).toString('base64')
  const initSrc = path.join(__dirname, '../src/base64.ts')
  fs.writeFileSync(initSrc, 'export default \'' + wasmBase64 + "'\n")
}

main()
