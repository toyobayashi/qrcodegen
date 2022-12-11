/// <reference path="../dist/qrcodegen.d.ts" />

qrcodegen.init().then((api) => {
  const matrix = api.encodeText('fdsafdsa', 3)
  console.log(matrix)
  console.log(api.encodeBinary(new Uint8Array([1])))

  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById('canvas')

  qrcodegen.drawCanvas(canvas, matrix, {
    // foregroundColor: 'white',
    // backgroundColor: 'black',
    padding: 0
  })
})
