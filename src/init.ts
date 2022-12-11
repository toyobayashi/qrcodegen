import { load } from '@tybys/wasm-util'
import wasmBase64 from './base64'

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
export interface Api {
  encodeText: (text: string, ecc?: Ecc) => Array<Array<0 | 1>>
  encodeBinary: (binary: BufferSource, ecc?: Ecc) => Array<Array<0 | 1>>
}

interface Instance {
  exports: Exports
}

let wasmPromise: Promise<Api> | undefined

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

  const wasmSource = typeof Buffer !== 'undefined'
    ? Buffer.from(wasmBase64, 'base64')
    : new URL('data:application/wasm;base64,' + wasmBase64)

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

function createApi (instance: Instance): Api {
  const malloc = function (size: number): number {
    return instance.exports.malloc(size)
  }
  const free = function (pointer: number): void {
    instance.exports.free(pointer)
  }
  const makeMatrix = function (qrcode: number): Array<Array<0 | 1>> {
    const size = instance.exports.qrcodegen_getSize(qrcode)
    const matrix: Array<Array<0 | 1>> = Array.from({ length: size }, () => Array(size))
    for (let y = 0; y < size; ++y) {
      for (let x = 0; x < size; ++x) {
        matrix[y][x] = instance.exports.qrcodegen_getModule(qrcode, x, y)
      }
    }
    return matrix
  }
  const encodeText = function (text: string, ecc: Ecc = Ecc.LOW): Array<Array<0 | 1>> {
    const buffer = new TextEncoder().encode(text)
    const pointer = malloc(buffer.byteLength + 1)
    const memory = new Uint8Array(instance.exports.memory.buffer)
    memory.set(buffer, pointer)
    memory[pointer + buffer.byteLength] = 0
    const max = BUFFER_LEN_FOR_VERSION(40)
    const qrcode = malloc(max)
    const tempBuffer = malloc(max)
    const ok = instance.exports.qrcodegen_encodeText(
      pointer, tempBuffer, qrcode, ecc, 1, 40, -1, 1
    )
    free(tempBuffer)
    free(pointer)
    let matrix: Array<Array<0 | 1>>
    if (ok) {
      matrix = makeMatrix(qrcode)
      free(qrcode)
    } else {
      free(qrcode)
      throw new Error('encoding failed')
    }
    return matrix
  }

  const encodeBinary = function (binary: BufferSource, ecc: Ecc = Ecc.LOW): Array<Array<0 | 1>> {
    const buffer = binary instanceof ArrayBuffer
      ? new Uint8Array(binary)
      : new Uint8Array(binary.buffer, binary.byteOffset, binary.byteLength)
    const memory = new Uint8Array(instance.exports.memory.buffer)
    const max = BUFFER_LEN_FOR_VERSION(40)
    if (buffer.byteLength > max) {
      throw new Error('data is too big')
    }
    const qrcode = malloc(max)
    const tempBuffer = malloc(max)
    memory.set(buffer, tempBuffer)
    const ok = instance.exports.qrcodegen_encodeBinary(
      tempBuffer, buffer.byteLength, qrcode, ecc, 1, 40, -1, 1
    )
    free(tempBuffer)
    let matrix: Array<Array<0 | 1>>
    if (ok) {
      matrix = makeMatrix(qrcode)
      free(qrcode)
    } else {
      free(qrcode)
      throw new Error('encoding failed')
    }
    return matrix
  }

  return {
    encodeText,
    encodeBinary
  }
}
