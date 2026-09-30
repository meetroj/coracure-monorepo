/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'doctor',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '[.]svg$': '<rootDir>/src/test/svg-mock.js',
    // The workspace libraries, mapped for Jest the way tsconfig.base.json maps
    // them for the compiler and withNxMetro maps them for the bundler. The
    // deeper path has to come first: Jest tries these in order, and a bare
    // `@coracure/api$` would never match `@coracure/api/errors` but an
    // unanchored one would swallow it.
    '^@coracure/api/errors$': '<rootDir>/../../libs/api/src/errors.ts',
    '^@coracure/api$': '<rootDir>/../../libs/api/src/index.ts',
  },
  transform: {
    '^.+[.](js|ts|tsx)$': [
      'babel-jest',
      {
        configFile: __dirname + '/.babelrc.js',
      },
    ],
    '^.+[.](bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      'react-native/jest/assetFileTransformer.js'
    ),
  },
  // React Navigation ships ES modules, and react-native-image-picker ships
  // untranspiled TypeScript, so both are transformed like React Native itself.
  // `react-native-image-picker` needs naming in full: the alternation below
  // requires a slash straight after `react-native`, so the shorter branch does
  // not cover it.
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/.+/node_modules/)?(react-native|@react-native(-community)?|@react-navigation|react-native-image-picker)/)',
  ],
  coverageDirectory: '../../coverage/apps/doctor',
  // AppShell pulls in every screen, so a first render is heavy. Under full-suite
  // load that exceeds the 5s default and fails tests that pass in isolation.
  testTimeout: 30000,
};