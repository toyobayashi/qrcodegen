# qrcodegen

WebAssembly version of [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator).

Build with wasi-sdk for small size instead of Emscripten.

Support browser and WeChat mini program.

[API documentation](https://github.com/toyobayashi/qrcodegen/blob/main/docs/api/README.md)

## Usage

```bash
npm install @tybys/qrcodegen
```

### HTML script tag

```html
<!DOCTYPE html>
<html>
<head>
  <title>qrcodegen</title>
</head>
<body>
  <canvas width="200" height="200" id="canvas"></canvas>
  <script src="https://cdn.jsdelivr.net/npm/@tybys/qrcodegen/dist/qrcodegen.min.js"></script>
  <script>
  /// <reference path="./node_modules/@tybys/qrcodegen/dist/qrcodegen.d.ts" />

  qrcodegen.init().then(function (api) {
    var matrix = api.encodeText('Hello world!', qrcodegen.Ecc.LOW);

    /** @type {HTMLCanvasElement} */
    var canvas = document.getElementById('canvas');

    qrcodegen.drawCanvas(canvas, matrix, {
      // foregroundColor: '#000000',
      // backgroundColor: '#ffffff',
      // padding: 0
    });
  });
  </script>
</body>
</html>
```

### Webpack

```js
import { init, drawCanvas, Ecc } from '@tybys/qrcodegen'

init().then(function (api) {
  var matrix = api.encodeText('Hello world!', Ecc.LOW)

  /** @type {HTMLCanvasElement} */
  var canvas = document.getElementById('canvas')

  drawCanvas(canvas, matrix, {
    // foregroundColor: '#000000',
    // backgroundColor: '#ffffff',
    // padding: 0
  })
})
```

### WeChat mini program

```html
<canvas type="2d" id="canvas" style="width: 750rpx; height: 750rpx"></canvas>
```

```js
const { init, drawCanvas, Ecc } = require('@tybys/qrcodegen')

const dpr = wx.getSystemInfoSync().pixelRatio
const scale = wx.getSystemInfoSync().screenWidth / 375

function getCanvas (id) {
  return new Promise(resolve => {
    const query = wx.createSelectorQuery()
    query.select(id)
      .fields({ node: true, size: true })
      .exec((res) => {
        resolve(res[0].node)
      })
  })
}

Page({
  onReady () {
    Promise.all([
      getCanvas('#canvas'),
      init()
    ]).then(([canvas, api]) => {
      canvas.width = 375 * scale * dpr
      canvas.height = 375 * scale * dpr

      const matrix = api.encodeText('Hello world!', Ecc.LOW)
      drawCanvas(canvas, matrix, {
        // foregroundColor: '#000000',
        // backgroundColor: '#ffffff',
        // padding: 0
      })
    })
  }
})
```

## Building

Install [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) (`$WASI_SDK_PATH`) and
[binaryen](https://github.com/WebAssembly/binaryen)

```
npm install --ignore-scripts
npm run build:wasm
npm run build
```
