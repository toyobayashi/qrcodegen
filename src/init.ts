import { load } from '@tybys/wasm-util'
import wasmBase64 from './base64'
import { Scope } from './scope'

declare const __TSGO_ENV__: string

const BUFFER_LEN_FOR_VERSION = (n: number): number => (Math.floor((((n) * 4 + 17) * ((n) * 4 + 17) + 7) / 8) + 1)

interface Exports {
  _initialize?: () => void
  malloc: (size: number) => number
  free: (pointer: number) => void
  memory: WebAssembly.Memory
  qrcodegen_encodeText: (
    text: number,
    tempBuffer: number,
    qrcode: number,
    ecl: number,
    minVersion: number,
    maxVersion: number,
    mask: number,
    boostEcl: number
  ) => 0 | 1
  qrcodegen_encodeBinary: (
    dataAndTemp: number,
    dataLen: number,
    qrcode: number,
    ecl: number,
    minVersion: number,
    maxVersion: number,
    mask: number,
    boostEcl: number
  ) => 0 | 1
  qrcodegen_getSize: (qrcode: number) => number
  qrcodegen_getModule: (qrcode: number, x: number, y: number) => 0 | 1
}

/** @public */
export type Matrix = Array<Array<0 | 1>>

/** @public */
export interface Api {
  encodeText: (text: string, ecc?: Ecc) => Matrix
  encodeBinary: (binary: BufferSource, ecc?: Ecc) => Matrix
}

export interface Instance {
  exports: Exports
}

let wasmPromise: Promise<Api> | undefined

const currentSrc = (
  typeof document !== 'undefined' &&
  document.currentScript &&
  (document.currentScript as HTMLScriptElement).src
) ?? ''

/** @public */
export function init (customWasm?: string | URL | BufferSource): Promise<Api> {
  if (wasmPromise) {
    return wasmPromise
  }
  const resolve = function ({ instance }: WebAssembly.WebAssemblyInstantiatedSource): Api {
    if (typeof instance.exports._initialize === 'function') {
      instance.exports._initialize()
    }
    return createApi(instance as unknown as Instance)
  }
  const reject = function (err: any): Api {
    wasmPromise = undefined
    throw err
  }
  if (customWasm) {
    wasmPromise = load(customWasm).then(resolve, reject)
    return wasmPromise
  }

  let wasmSource: Uint8Array | URL | string
  if (typeof __TSGO_ENV__ === 'undefined' || __TSGO_ENV__ === 'any') {
    wasmSource = typeof Buffer !== 'undefined'
      ? Buffer.from(wasmBase64, 'base64')
      : new URL('data:application/wasm;base64,' + wasmBase64)
  } else {
    if (__TSGO_ENV__ === 'weapp') {
      wasmSource = '/miniprogram_npm/@tybys/qrcodegen/qrcodegen.wasm'
    } else {
      if (currentSrc) {
        const dirname = currentSrc.substring(0, currentSrc.lastIndexOf('/'))
        wasmSource = dirname + '/qrcodegen.wasm'
      } else {
        wasmSource = './qrcodegen.wasm'
      }
    }
  }

  wasmPromise = load(wasmSource).then(resolve, reject)
  return wasmPromise
}

/** @public */
export enum Ecc {
  LOW = 0,
  MEDIUM,
  QUARTILE,
  HIGH
}

function lengthBytesUTF8 (str: string): number {
  let len = 0
  for (let i = 0; i < str.length; ++i) {
    const c = str.charCodeAt(i)
    if (c <= 127) {
      len++
    } else if (c <= 2047) {
      len += 2
    } else if (c >= 55296 && c <= 57343) {
      len += 4
      ++i
    } else {
      len += 3
    }
  }
  return len
}

function stringToUTF8Array (str: string, heap: Uint8Array, outIdx: number, maxBytesToWrite: number): number {
  if (!(maxBytesToWrite > 0)) return 0
  const startIdx = outIdx
  const endIdx = outIdx + maxBytesToWrite - 1
  for (let i = 0; i < str.length; ++i) {
    let u = str.charCodeAt(i)
    if (u >= 55296 && u <= 57343) {
      const u1 = str.charCodeAt(++i)
      u = 65536 + ((u & 1023) << 10) | u1 & 1023
    }
    if (u <= 127) {
      if (outIdx >= endIdx) break
      heap[outIdx++] = u
    } else if (u <= 2047) {
      if (outIdx + 1 >= endIdx) break
      heap[outIdx++] = 192 | u >> 6
      heap[outIdx++] = 128 | u & 63
    } else if (u <= 65535) {
      if (outIdx + 2 >= endIdx) break
      heap[outIdx++] = 224 | u >> 12
      heap[outIdx++] = 128 | u >> 6 & 63
      heap[outIdx++] = 128 | u & 63
    } else {
      if (outIdx + 3 >= endIdx) break
      heap[outIdx++] = 240 | u >> 18
      heap[outIdx++] = 128 | u >> 12 & 63
      heap[outIdx++] = 128 | u >> 6 & 63
      heap[outIdx++] = 128 | u & 63
    }
  }
  heap[outIdx] = 0
  return outIdx - startIdx
}

function createApi (instance: Instance): Api {
  const makeMatrix = function (qrcode: number): Matrix {
    const size = instance.exports.qrcodegen_getSize(qrcode)
    const matrix: Matrix = Array.from({ length: size }, () => Array(size))
    for (let y = 0; y < size; ++y) {
      for (let x = 0; x < size; ++x) {
        matrix[y][x] = instance.exports.qrcodegen_getModule(qrcode, x, y)
      }
    }
    return matrix
  }
  const encodeText = function (text: string, ecc: Ecc = Ecc.LOW): Matrix {
    return Scope.run(instance, (scope) => {
      const memory = new Uint8Array(instance.exports.memory.buffer)
      let pointer: number
      if (typeof TextEncoder === 'function') {
        const buffer = new TextEncoder().encode(text)
        pointer = scope.malloc(buffer.byteLength + 1)
        memory.set(buffer, pointer)
        memory[pointer + buffer.byteLength] = 0
      } else {
        const size = lengthBytesUTF8(text) + 1
        pointer = scope.malloc(size)
        stringToUTF8Array(text, memory, pointer, size)
      }
      const max = BUFFER_LEN_FOR_VERSION(40)
      const qrcode = scope.malloc(max)
      const tempBuffer = scope.malloc(max)
      const ok = instance.exports.qrcodegen_encodeText(
        pointer, tempBuffer, qrcode, ecc, 1, 40, -1, 1
      )
      let matrix: Matrix
      if (ok) {
        matrix = makeMatrix(qrcode)
      } else {
        throw new Error('encoding failed')
      }
      return matrix
    })
  }

  const encodeBinary = function (binary: BufferSource, ecc: Ecc = Ecc.LOW): Matrix {
    return Scope.run(instance, (scope) => {
      const buffer = binary instanceof ArrayBuffer
        ? new Uint8Array(binary)
        : new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength)
      const memory = new Uint8Array(instance.exports.memory.buffer)
      const max = BUFFER_LEN_FOR_VERSION(40)
      if (buffer.byteLength > max) {
        throw new Error('data is too big')
      }
      const qrcode = scope.malloc(max)
      const tempBuffer = scope.malloc(max)
      memory.set(buffer, tempBuffer)
      const ok = instance.exports.qrcodegen_encodeBinary(
        tempBuffer, buffer.byteLength, qrcode, ecc, 1, 40, -1, 1
      )
      let matrix: Matrix
      if (ok) {
        matrix = makeMatrix(qrcode)
      } else {
        throw new Error('encoding failed')
      }
      return matrix
    })
  }

  return {
    encodeText,
    encodeBinary
  }
}

/** @public */
export interface DrawOptions {
  backgroundColor?: string
  foregroundColor?: string
  padding?: number
}

/** @public */
export interface CanvasRenderingContext2DLike {
  fillStyle: string
  fillRect (x: number, y: number, w: number, h: number): void
}

/** @public */
export interface CanvasLike {
  width: number
  height: number
  getContext (contextId: '2d'): CanvasRenderingContext2DLike
}

/** @public */
export function drawCanvas (canvas: CanvasLike, matrix: Matrix, options?: DrawOptions): void {
  const size = matrix.length
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height ?? canvasWidth
  const ctx = canvas.getContext('2d')
  options = options ?? {}
  const padding = options.padding ?? 0
  ctx.fillStyle = options.backgroundColor ?? '#ffffff'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const deltaWidth = ((canvasWidth - 2 * padding) / size)
  const deltaHeight = ((canvasHeight - 2 * padding) / size)

  for (let y = 0; y < size; ++y) {
    for (let x = 0; x < size; ++x) {
      const isDark = matrix[y][x]
      if (isDark) {
        ctx.fillStyle = options.foregroundColor ?? '#000000'
        ctx.fillRect(padding + x * deltaWidth, padding + y * deltaHeight, deltaWidth, deltaHeight)
      }
    }
  }
}
