import { join } from 'path'
import type { InitialOptionsTsJest } from 'ts-jest/dist/types'
// import { jsWithTs as tsjPreset } from 'ts-jest/presets'

const config: InitialOptionsTsJest = {
  preset: 'ts-jest/presets/js-with-ts',
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,js}'
  ],
  // transform: {
  //   // '\\.[jt]sx?$': 'ts-jest'
  //   ...tsjPreset.transform
  // },
  globals: {
    'ts-jest': {
      tsconfig: join(__dirname, 'tsconfig.json'),
      useESM: true
    }
  }
}

export default config
