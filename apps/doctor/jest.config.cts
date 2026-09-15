/// <reference types="jest" />
/// <reference types="node" />
module.exports = {
  displayName: 'doctor',
  preset: 'react-native',
  resolver: '@nx/jest/plugins/resolver',
  moduleFileExtensions: ['ts', 'js', 'html', 'tsx', 'jsx'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '[.]svg$': '<rootDir>/src/test/svg-mock.js'
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
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm/.+/node_modules/)?(react-native|@react-native(-community)?)/)',
  ],
  coverageDirectory: '../../coverage/apps/doctor',
  // AppShell pulls in every screen, so a first render is heavy. Under full-suite
  // load that exceeds the 5s default and fails tests that pass in isolation.
  testTimeout: 30000,
};