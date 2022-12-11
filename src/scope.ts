import type { Instance } from './init'

export class Scope {
  private _pointers: Array<{ pointer: number; size: number }>

  constructor (private readonly _instance: Instance) {
    this._pointers = []
  }

  malloc (size: number): number {
    const pointer = this._instance.exports.malloc(size)
    if (pointer === 0) {
      throw new Error('OOM')
    }
    this._pointers.push({ pointer, size })
    return pointer
  }

  dispose (): void {
    if (!this._pointers) return
    const pointers = this._pointers
    this._pointers = undefined!
    for (let i = 0; i < pointers.length; ++i) {
      const p = pointers[i]
      this._instance.exports.free(p.pointer)
    }
  }

  static run<T>(instance: Instance, fn: (scope: Scope) => T): T {
    const scope = new Scope(instance)
    let r: T
    try {
      r = fn(scope)
    } catch (err) {
      scope.dispose()
      throw err
    }
    scope.dispose()
    return r
  }
}
